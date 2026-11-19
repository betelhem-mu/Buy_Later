
export type PurchaseStatus =
    | 'Active'
    | 'Overdue'
    | 'Purchased'
    | 'Cancelled';

export type PurchasePriority =
    | 'Low'
    | 'Medium'
    | 'High';

export interface Purchase {
    id: string;
    name: string;
    estimatedPrice: number;
    actualPrice?: number;
    priority: PurchasePriority;
    plannedDate: string;
    createdAt: string;
    purchasedAt?: string;
    savedAmount: number;
    images: string[];
    status: PurchaseStatus;

    reminderNotificationIds?: string[];
    overdueNotificationId?: string;
    notificationsScheduled?: boolean;
}