/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Article {
  code: string;
  name: string;
  category: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  unit: string;
  createdAt?: string;
}

export interface DatabaseItem {
  name: string;
  category: string;
}

export interface Movement {
  articleCode: string;
  type: 'DALJE' | 'HYRJE';
  quantity: number;
  client?: string;
  repairNo?: string;
  unit?: string;
  date?: string;
}

export interface OrderItem {
  article: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
}

export interface Order {
  id: number;
  supplier: string;
  items: OrderItem[];
  date: string;
  completed: boolean;
  total: number;
}

export interface Payment {
  id?: number;
  supplier: string;
  amount: number;
  date: string;
}
