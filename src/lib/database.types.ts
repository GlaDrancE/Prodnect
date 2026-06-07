// Hand-written types for Phase 1. Once the schema is applied you can regenerate
// these with: supabase gen types typescript --linked > src/lib/database.types.ts

export type SubscriptionStatus = "active" | "expired" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invoice_seq: number;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; owner_id: string };
        Update: { name?: string };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          workspace_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; full_name?: string | null; workspace_id: string };
        Update: { full_name?: string | null };
      };
      clients: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          category: string | null;
          default_cost_price: number;
          default_sell_price: number;
          billing_period_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          name: string;
          category?: string | null;
          default_cost_price?: number;
          default_sell_price?: number;
          billing_period_days?: number;
        };
        Update: {
          name?: string;
          category?: string | null;
          default_cost_price?: number;
          default_sell_price?: number;
          billing_period_days?: number;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string;
          product_id: string | null;
          login_id: string | null;
          login_password_encrypted: string | null;
          cost_price: number;
          sell_price: number;
          profit: number;
          start_date: string;
          expiry_date: string;
          status: SubscriptionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          client_id: string;
          product_id?: string | null;
          login_id?: string | null;
          login_password_encrypted?: string | null;
          cost_price?: number;
          sell_price?: number;
          start_date?: string;
          expiry_date: string;
          status?: SubscriptionStatus;
        };
        Update: {
          product_id?: string | null;
          login_id?: string | null;
          login_password_encrypted?: string | null;
          cost_price?: number;
          sell_price?: number;
          start_date?: string;
          expiry_date?: string;
          status?: SubscriptionStatus;
        };
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string;
          number: string;
          issue_date: string;
          due_date: string | null;
          status: InvoiceStatus;
          currency: string;
          subtotal: number;
          tax: number;
          total: number;
          pdf_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          client_id: string;
          number: string;
          issue_date?: string;
          due_date?: string | null;
          status?: InvoiceStatus;
          currency?: string;
          subtotal?: number;
          tax?: number;
          total?: number;
        };
        Update: {
          status?: InvoiceStatus;
          due_date?: string | null;
          subtotal?: number;
          tax?: number;
          total?: number;
          pdf_url?: string | null;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string;
          subscription_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          invoice_id: string;
          subscription_id?: string | null;
          description: string;
          quantity?: number;
          unit_price?: number;
        };
        Update: {
          description?: string;
          quantity?: number;
          unit_price?: number;
        };
      };
      notification_log: {
        Row: {
          id: string;
          workspace_id: string;
          subscription_id: string;
          kind: "reminder_3d" | "expiry";
          expiry_date: string;
          owner_email_sent: boolean;
          client_email_sent: boolean;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          subscription_id: string;
          kind: "reminder_3d" | "expiry";
          expiry_date: string;
          owner_email_sent?: boolean;
          client_email_sent?: boolean;
        };
        Update: {
          owner_email_sent?: boolean;
          client_email_sent?: boolean;
        };
      };
    };
    Views: {
      v_client_totals: {
        Row: {
          client_id: string;
          workspace_id: string;
          client_name: string;
          active_subscriptions: number;
          revenue: number;
          profit: number;
          next_expiry: string | null;
        };
      };
      v_workspace_summary: {
        Row: {
          workspace_id: string;
          total_clients: number;
          active_subscriptions: number;
          expiring_within_7d: number;
          overdue: number;
          total_revenue: number;
          total_profit: number;
        };
      };
      v_expiring_subscriptions: {
        Row: {
          subscription_id: string;
          workspace_id: string;
          client_id: string;
          client_name: string;
          client_email: string | null;
          product_name: string | null;
          sell_price: number;
          expiry_date: string;
          days_left: number;
          status: "active" | "expired" | "cancelled";
          bucket: "overdue" | "due_today" | "expiring_soon";
        };
      };
    };
    Functions: {
      next_invoice_number: { Args: Record<string, never>; Returns: string };
    };
  };
}
