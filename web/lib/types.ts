export type User = {
  id: string;
  displayName: string;
  legalName?: string;
  email?: string;
  whatsapp?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  avatar?: string;
  verified?: boolean;
  verificationStatus?: string;
  provider?: string;
  socialId?: string;
  linkedProviders?: Array<{ provider: string }>;
  ktpPhotoUrl?: string;
  ktpVideoUrl?: string;
  locationVerified?: boolean;
  presence?: PresenceInfo;
};

export type PresenceInfo = {
  isOnline: boolean;
  lastSeenAt?: string;
  activeTransactionCode?: string;
};

export type TransactionMessage = {
  id: number;
  sender: string;
  senderUserId: string | null;
  senderTitle: string;
  senderVerified: boolean;
  text: string;
  time: string;
  kind: "message";
};

export type TransactionUpload = {
  id: number;
  name: string;
  url: string;
  sender: string;
  senderUserId: string | null;
  senderTitle: string;
  senderVerified: boolean;
  time: string;
  kind: "upload";
};

export type TimelineItem = TransactionMessage | TransactionUpload;

export type Transaction = {
  code: string;
  title: string;
  price: number;
  type: string;
  warranty: string;
  paymentStatus: string;
  feePayer: string;
  feeAmount: number;
  adminFundsReceived: boolean;
  buyerConfirmedReceived: boolean;
  sellerPayoutSent: boolean;
  createdAt: string;
  createdByRole?: "buyer" | "seller";
  adminPayoutAccount?: string;
  sellerBankName?: string;
  sellerBankNumber?: string;
  sellerBankHolder?: string;
  buyer: User | null;
  seller: User | null;
  messages: TransactionMessage[];
  uploads: TransactionUpload[];
  adminPresence?: PresenceInfo;
  typing?: Record<string, string>;
  settlement?: {
    buyerTransferAmount: number;
    sellerReceiveAmount: number;
  };
};

export type SessionUser = User & {
  isAdmin?: boolean;
};
