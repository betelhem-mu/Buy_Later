export type ActivityType =
    | 'Purchase planned'
    | 'Savings updated'
    | 'Purchase completed'
    | 'Purchase cancelled';

export interface PurchaseActivity {
    id: string;
    type: ActivityType;
    purchaseId: string;
    purchaseName: string;
    amount?: number;
    createdAt: string;
}