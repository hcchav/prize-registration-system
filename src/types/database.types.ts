export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendees: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          verified: boolean
          created_at: string
          updated_at: string
          otp: string | null
          prize: string | null
          prize_id: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          phone?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
          otp?: string | null
          prize?: string | null
          prize_id?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          phone?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
          otp?: string | null
          prize?: string | null
          prize_id?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
        }
      }
      prizes: {
        Row: {
          id?: string
          name: string
          stock: number
          claimed: number
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          stock: number
          claimed: number
          created_at?: string
        }
        Update: {
          id?: string
          name: string
          stock: number
          claimed: number
          created_at?: string
        }
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: string[]
    }
  }
}
