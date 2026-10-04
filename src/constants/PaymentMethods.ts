export type PaymentMethodValue = 
| 'PIX'
| 'DINHEIRO'
| 'CARTÃO CRÉDITO'
| 'CARTÃO DÉBITO';

export interface PaymentMethodConfig{
    label: string;
    value: PaymentMethodValue;
    color: string;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
{
    label: 'Pix',
    value: 'PIX',
    color: '#06b6d4',
},
{
    label: 'Dinheiro',
    value: 'DINHEIRO',
    color: '#16a34a'
},
{
    label: 'Débito',
    value: 'CARTÃO DÉBITO',
    color: '#2563eb'
},
{
    label: 'Crédito',
    value: 'CARTÃO CRÉDITO',
    color: '#ffc107'
},
];

export function normalizePaymentMethod( value: string | null | undefined): PaymentMethodValue | null {
    if(!value) return null;

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'pix') return 'PIX';
    if (normalizedValue === 'dinheiro') return 'DINHEIRO';
    if (normalizedValue === 'cartão débito') return 'CARTÃO DÉBITO';
    if (normalizedValue === 'cartão crédito') return 'CARTÃO CRÉDITO';

    return null;
}