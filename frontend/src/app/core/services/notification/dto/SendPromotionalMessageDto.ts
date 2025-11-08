export interface SendPromotionalMessageDto {
  title: string;
  message: string;
  actionUrl?: string;
  imageUrl?: string;
}

export interface SendPromotionalMessageResponse {
  sentCount: number;
}
