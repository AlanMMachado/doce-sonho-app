import { COLORS } from '@/constants/Colors';
import {
  buildDropLines,
  DropLine,
  EditResult,
  findDropGap,
  insertVariable,
  PendingCorrection,
  resolveNativeChange,
  splitTemplate,
  TextLine,
  TextRange,
} from '@/lib/utils/chargeTemplateEditor';
import { CHARGE_TEMPLATE_VARIABLES } from '@/lib/utils/whatsapp';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutRectangle, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Portal } from 'react-native-paper';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const VARIABLE_COLORS: Record<string, string> = {
  cliente: COLORS.mediumBlue,
  compras: COLORS.emerald,
  total: COLORS.orange,
};

// Na web não há onTextLayout, então não é possível alinhar as cores nem localizar o soltar.
const SUPPORTS_RICH_EDITING = Platform.OS !== 'web';

// No Android, 'transparent' vale 0, o mesmo que "cor não definida", e o texto cairia no preto
// padrão. Com alfa mínimo a cor é respeitada e o texto continua invisível.
const INVISIBLE_TEXT_COLOR = '#00000001';

// Tempo para o Android confirmar o cursor. Passado isso, a mudança é um toque do usuário.
const CURSOR_CONFIRM_MS = 300;

const INPUT_BORDER = 1;
const INPUT_PADDING = 16;
const TEXT_INSET = INPUT_BORDER + INPUT_PADDING;
// Espaço no fim da caixa para a última linha não passar por baixo do contador.
const COUNTER_CLEARANCE = 32;
const DROP_MARGIN = 24;
const GHOST_OFFSET_X = 44;
const GHOST_OFFSET_Y = 64;
// O ponto de soltar fica entre a variável arrastada e a ponta do dedo, para o cursor não ser
// coberto por nenhum dos dois.
const DROP_POINT_OFFSET_Y = 20;

const EMPTY_LAYOUT: LayoutRectangle = { x: 0, y: 0, width: 0, height: 0 };

interface DropArea {
  box: LayoutRectangle;
  row: LayoutRectangle;
  chips: Record<string, LayoutRectangle>;
}

// Estado do arraste lido na UI thread, para a variável seguir o dedo sem depender do JS.
interface DragValues {
  ghostPosition: SharedValue<{ x: number; y: number }>;
  dropArea: SharedValue<DropArea>;
  dropLines: SharedValue<DropLine[]>;
  dropOffset: SharedValue<number | null>;
}

// Mantém a mesma referência entre renders, para o gesto não ser recriado durante o arraste.
function useStableCallback<Args extends unknown[]>(callback: (...args: Args) => void) {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  return useCallback((...args: Args) => callbackRef.current(...args), []);
}

function variableFill(key: string) {
  return { backgroundColor: `${VARIABLE_COLORS[key]}40` };
}

// Só muda o preenchimento, sem negrito: a largura precisa ser igual à do texto no TextInput.
function renderSpans(text: string) {
  return splitTemplate(text).map((segment, index) => (
    <Text
      key={index}
      style={
        segment.variableKey
          ? variableFill(segment.variableKey)
          : segment.isUnknownVariable
            ? styles.unknownVariableSpan
            : undefined
      }
    >
      {segment.text}
    </Text>
  ));
}

interface VariableChipProps {
  variableKey: string;
  description: string;
  onLayout: (layout: LayoutRectangle) => void;
  onPress: () => void;
  dragValues: DragValues;
  onDragStart: (key: string) => void;
  onDropOffsetChange: (offset: number | null) => void;
  onDragEnd: (key: string, offset: number | null) => void;
}

function VariableChip({
  variableKey,
  description,
  onLayout,
  onPress,
  dragValues,
  onDragStart,
  onDropOffsetChange,
  onDragEnd,
}: VariableChipProps) {
  const gesture = useMemo(() => {
    const { ghostPosition, dropArea, dropLines, dropOffset } = dragValues;

    return Gesture.Pan()
      .enabled(SUPPORTS_RICH_EDITING)
      .minDistance(6)
      .shouldCancelWhenOutside(false)
      .onStart(event => {
        'worklet';
        ghostPosition.set({ x: event.absoluteX, y: event.absoluteY });
        dropOffset.set(null);
        scheduleOnRN(onDragStart, variableKey);
      })
      .onUpdate(event => {
        'worklet';
        ghostPosition.set({ x: event.absoluteX, y: event.absoluteY });

        const { box, row, chips } = dropArea.get();
        const chip = chips[variableKey];
        if (!chip) return;

        // Botões e caixa são irmãos: a posição relativa vem dos layouts, medidos no mesmo pai.
        const x = row.x + chip.x - box.x + event.x;
        const y = row.y + chip.y - box.y + event.y - DROP_POINT_OFFSET_Y;
        const isOverBox =
          x >= -DROP_MARGIN && x <= box.width + DROP_MARGIN &&
          y >= -DROP_MARGIN && y <= box.height + DROP_MARGIN;

        const offset = isOverBox ? findDropGap(dropLines.get(), x - TEXT_INSET, y - TEXT_INSET) : null;
        if (offset !== dropOffset.get()) {
          dropOffset.set(offset);
          scheduleOnRN(onDropOffsetChange, offset);
        }
      })
      .onEnd((_event, success) => {
        'worklet';
        scheduleOnRN(onDragEnd, variableKey, success ? dropOffset.get() : null);
      });
  }, [dragValues, onDragEnd, onDragStart, onDropOffsetChange, variableKey]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} onLayout={(event) => onLayout(event.nativeEvent.layout)}>
        <TouchableOpacity
          style={[styles.chip, variableFill(variableKey)]}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Inserir ${description}`}
        >
          <Text style={styles.chipText}>{`{${variableKey}}`}</Text>
        </TouchableOpacity>
      </View>
    </GestureDetector>
  );
}

interface ChargeTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  error?: boolean;
  onDragActiveChange?: (active: boolean) => void;
}

export default function ChargeTemplateEditor({
  value,
  onChange,
  maxLength,
  error = false,
  onDragActiveChange,
}: ChargeTemplateEditorProps) {
  const dropAreaRef = useRef<DropArea>({ box: EMPTY_LAYOUT, row: EMPTY_LAYOUT, chips: {} });
  const valueRef = useRef(value);
  const selectionRef = useRef<TextRange>({ start: value.length, end: value.length });
  const correctionRef = useRef<PendingCorrection | null>(null);
  const expectedCursorRef = useRef<{ cursor: number; until: number } | null>(null);

  const ghostPosition = useSharedValue({ x: 0, y: 0 });
  const dropArea = useSharedValue(dropAreaRef.current);
  const dropLines = useSharedValue<DropLine[]>([]);
  const sharedDropOffset = useSharedValue<number | null>(null);
  const dragValues = useMemo(
    () => ({ ghostPosition, dropArea, dropLines, dropOffset: sharedDropOffset }),
    [ghostPosition, dropArea, dropLines, sharedDropOffset]
  );
  const ghostStyle = useAnimatedStyle(() => {
    const { x, y } = ghostPosition.get();
    return { transform: [{ translateX: x - GHOST_OFFSET_X }, { translateY: y - GHOST_OFFSET_Y }] };
  });

  const [lines, setLines] = useState<TextLine[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropOffset, setDropOffset] = useState<number | null>(null);
  // A posição do cursor só é forçada depois de uma edição feita pelo app. Manter selection
  // sempre controlado faz o cursor voltar durante a digitação no Android.
  const [forcedSelection, setForcedSelection] = useState<TextRange>();

  useEffect(() => {
    if (valueRef.current === value) return;
    valueRef.current = value;
    correctionRef.current = null;
    expectedCursorRef.current = null;
    selectionRef.current = { start: value.length, end: value.length };
  }, [value]);

  useEffect(() => {
    dropLines.set(buildDropLines(value, lines));
  }, [dropLines, lines, value]);

  const updateDropArea = (changes: Partial<DropArea>) => {
    dropAreaRef.current = { ...dropAreaRef.current, ...changes };
    dropArea.set(dropAreaRef.current);
  };

  // value e selection mudam no mesmo render, e o TextInput envia os dois no mesmo comando.
  const forceEdit = ({ text, cursor }: EditResult) => {
    selectionRef.current = { start: cursor, end: cursor };
    expectedCursorRef.current = { cursor, until: Date.now() + CURSOR_CONFIRM_MS };
    setForcedSelection({ start: cursor, end: cursor });
    valueRef.current = text;
    onChange(text);
  };

  // Ao trocar o texto, o Android reposiciona o cursor e avisa essa posição intermediária.
  // Ela não pode ser tomada como definitiva: até confirmar, o cursor esperado é reenviado.
  const handleSelectionChange = (selection: TextRange) => {
    const expected = expectedCursorRef.current;
    if (expected && Date.now() < expected.until && selection.start !== expected.cursor) {
      setForcedSelection({ start: expected.cursor, end: expected.cursor });
      return;
    }

    expectedCursorRef.current = null;
    selectionRef.current = selection;
    setForcedSelection(undefined);
  };

  const commitEdit = (edit: EditResult) => {
    if (edit.text.length > maxLength) return;
    correctionRef.current = null;
    forceEdit(edit);
  };

  const handleChangeText = (next: string) => {
    const change = resolveNativeChange(valueRef.current, next, correctionRef.current);

    if (change.kind === 'accept') {
      if (change.text !== valueRef.current) expectedCursorRef.current = null;
      correctionRef.current = null;
      valueRef.current = change.text;
      onChange(change.text);
      return;
    }

    correctionRef.current = change.correction;
    forceEdit(change.correction.result);
  };

  const handleDragStart = useStableCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDragKey(key);
    onDragActiveChange?.(true);
  });

  const handleDragEnd = useStableCallback((key: string, offset: number | null) => {
    if (offset !== null) {
      commitEdit(insertVariable(valueRef.current, key, { start: offset, end: offset }));
    }
    setDragKey(null);
    setDropOffset(null);
    onDragActiveChange?.(false);
  });

  return (
    <View>
      <View style={styles.chipsRow} onLayout={(event) => updateDropArea({ row: event.nativeEvent.layout })}>
        {CHARGE_TEMPLATE_VARIABLES.map(variable => (
          <VariableChip
            key={variable.key}
            variableKey={variable.key}
            description={variable.description}
            onLayout={layout => updateDropArea({ chips: { ...dropAreaRef.current.chips, [variable.key]: layout } })}
            onPress={() => commitEdit(insertVariable(valueRef.current, variable.key, selectionRef.current))}
            dragValues={dragValues}
            onDragStart={handleDragStart}
            onDropOffsetChange={setDropOffset}
            onDragEnd={handleDragEnd}
          />
        ))}
      </View>

      <View style={styles.box} onLayout={(event) => updateDropArea({ box: event.nativeEvent.layout })}>
        {/* Fica atrás do TextInput e pinta as variáveis. Como repete o layout do texto, também
            informa as linhas, que o TextInput não expõe. */}
        {SUPPORTS_RICH_EDITING && (
          <Text
            style={[styles.editorText, styles.highlightLayer]}
            textBreakStrategy="simple"
            onTextLayout={(event) => setLines(event.nativeEvent.lines)}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {renderSpans(value)}
          </Text>
        )}

        <TextInput
          value={value}
          onChangeText={handleChangeText}
          selection={forcedSelection}
          onSelectionChange={(event) => handleSelectionChange(event.nativeEvent.selection)}
          maxLength={maxLength}
          multiline
          scrollEnabled={false}
          autoCorrect={false}
          textAlignVertical="top"
          style={[styles.input, styles.editorText, error && styles.inputError]}
        />

        {/* O cursor é desenhado aqui porque o nativo exige foco, e focar abriria o teclado no
            meio do arraste. O ponto de soltar nunca fica dentro de uma variável. */}
        {dragKey && dropOffset !== null && (
          <View style={styles.dropPreview} pointerEvents="none">
            <Text style={styles.editorText} textBreakStrategy="simple">
              {renderSpans(value.slice(0, dropOffset))}
              <Text style={styles.dropCaret}>|</Text>
              {renderSpans(value.slice(dropOffset))}
            </Text>
          </View>
        )}

        <Text style={styles.counter} pointerEvents="none">{value.length}/{maxLength}</Text>
      </View>

      {dragKey && (
        <Portal>
          <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
            <View style={[styles.chip, variableFill(dragKey)]}>
              <Text style={styles.chipText}>{`{${dragKey}}`}</Text>
            </View>
          </Animated.View>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },
  chipText: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: COLORS.darkGray },
  box: { backgroundColor: COLORS.white, borderRadius: 12 },
  input: {
    minHeight: 240,
    padding: INPUT_PADDING,
    paddingBottom: COUNTER_CLEARANCE,
    borderWidth: INPUT_BORDER,
    borderColor: COLORS.borderGray,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  inputError: { borderColor: COLORS.error },
  editorText: { fontSize: 15, lineHeight: 24, fontFamily: 'Nunito_400Regular', color: COLORS.darkGray },
  unknownVariableSpan: { backgroundColor: `${COLORS.error}40` },
  highlightLayer: { position: 'absolute', top: TEXT_INSET, left: TEXT_INSET, right: TEXT_INSET, color: INVISIBLE_TEXT_COLOR },
  dropPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: '100%',
    padding: INPUT_PADDING,
    paddingBottom: COUNTER_CLEARANCE,
    borderWidth: INPUT_BORDER,
    borderColor: COLORS.mediumBlue,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  dropCaret: { fontFamily: 'Nunito_700Bold', color: COLORS.mediumBlue },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: COLORS.textLight,
  },
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    elevation: 4,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
