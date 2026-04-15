export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      adminusers: {
        Row: {
          key: string;
          authuserid: string;
          schoolkey: string | null;
          fullname: string | null;
          email: string | null;
          phone: string | null;
          role: string | null;
          status: string | null;
          createdat: string | null;
          updatedat: string | null;
          isactive: boolean | null;
        };
        Insert: {
          key?: string;
          authuserid: string;
          schoolkey?: string | null;
          fullname?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: string | null;
          status?: string | null;
          createdat?: string | null;
          updatedat?: string | null;
          isactive?: boolean | null;
        };
        Update: {
          key?: string;
          authuserid?: string;
          schoolkey?: string | null;
          fullname?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: string | null;
          status?: string | null;
          createdat?: string | null;
          updatedat?: string | null;
          isactive?: boolean | null;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          key: string;
          name: string | null;
          email: string | null;
          slug: string | null;
          customdomain: string | null;
          isactive: boolean | null;
          componentvariants: Json | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          name?: string | null;
          email?: string | null;
          slug?: string | null;
          customdomain?: string | null;
          isactive?: boolean | null;
          componentvariants?: Json | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          name?: string | null;
          email?: string | null;
          slug?: string | null;
          customdomain?: string | null;
          isactive?: boolean | null;
          componentvariants?: Json | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          key: string;
          schoolkey: string | null;
          plankey: string | null;
          status: string | null;
          startdate: string | null;
          enddate: string | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          schoolkey?: string | null;
          plankey?: string | null;
          status?: string | null;
          startdate?: string | null;
          enddate?: string | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          schoolkey?: string | null;
          plankey?: string | null;
          status?: string | null;
          startdate?: string | null;
          enddate?: string | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          key: string;
          name: string | null;
          code: string | null;
          description: string | null;
          price: number | null;
          graceperiod: number | null;
          billgenerationdate: number | null;
          isactive: boolean | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          name?: string | null;
          code?: string | null;
          description?: string | null;
          price?: number | null;
          graceperiod?: number | null;
          billgenerationdate?: number | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          name?: string | null;
          code?: string | null;
          description?: string | null;
          price?: number | null;
          graceperiod?: number | null;
          billgenerationdate?: number | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          key: string;
          name: string | null;
          description: string | null;
          isactive: boolean | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          name?: string | null;
          description?: string | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          name?: string | null;
          description?: string | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      templatescreens: {
        Row: {
          key: string;
          templatekey: string | null;
          screenname: string | null;
          screencode: string | null;
          screenslug: string | null;
          displayorder: number | null;
          isactive: boolean | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          templatekey?: string | null;
          screenname?: string | null;
          screencode?: string | null;
          screenslug?: string | null;
          displayorder?: number | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          templatekey?: string | null;
          screenname?: string | null;
          screencode?: string | null;
          screenslug?: string | null;
          displayorder?: number | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      templatecomponents: {
        Row: {
          key: string;
          templatescreenkey: string | null;
          componentregistrykey: string | null;
          componentcode: string | null;
          displayorder: number | null;
          config: Json | null;
          isactive: boolean | null;
          iseditable: boolean | null;
          editorsname: string | null;
          editorsdescription: string | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          templatescreenkey?: string | null;
          componentregistrykey?: string | null;
          componentcode?: string | null;
          displayorder?: number | null;
          config?: Json | null;
          isactive?: boolean | null;
          iseditable?: boolean | null;
          editorsname?: string | null;
          editorsdescription?: string | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          templatescreenkey?: string | null;
          componentregistrykey?: string | null;
          componentcode?: string | null;
          displayorder?: number | null;
          config?: Json | null;
          isactive?: boolean | null;
          iseditable?: boolean | null;
          editorsname?: string | null;
          editorsdescription?: string | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      componentregistry: {
        Row: {
          key: string;
          componentcode: string | null;
          componentname: string | null;
          name: string | null;
          description: string | null;
          contenttable: string | null;
          isactive: boolean | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          componentcode?: string | null;
          componentname?: string | null;
          name?: string | null;
          description?: string | null;
          contenttable?: string | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          componentcode?: string | null;
          componentname?: string | null;
          name?: string | null;
          description?: string | null;
          contenttable?: string | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      media: {
        Row: {
          key: string;
          schoolkey: string | null;
          url: string | null;
          type: string | null;
          filename: string | null;
          mimetype: string | null;
          size: number | null;
          isactive: boolean | null;
          createdat: string | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          schoolkey?: string | null;
          url?: string | null;
          type?: string | null;
          filename?: string | null;
          mimetype?: string | null;
          size?: number | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          schoolkey?: string | null;
          url?: string | null;
          type?: string | null;
          filename?: string | null;
          mimetype?: string | null;
          size?: number | null;
          isactive?: boolean | null;
          createdat?: string | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      componentplacement: {
        Row: {
          key: string;
          schoolkey: string | null;
          templatecomponentkey: string | null;
          componentcode: string | null;
          contenttable: string | null;
          contentkey: string | null;
          displayorder: number | null;
          metadata: Json | null;
          isactive: boolean | null;
          updatedat: string | null;
        };
        Insert: {
          key?: string;
          schoolkey?: string | null;
          templatecomponentkey?: string | null;
          componentcode?: string | null;
          contenttable?: string | null;
          contentkey?: string | null;
          displayorder?: number | null;
          metadata?: Json | null;
          isactive?: boolean | null;
          updatedat?: string | null;
        };
        Update: {
          key?: string;
          schoolkey?: string | null;
          templatecomponentkey?: string | null;
          componentcode?: string | null;
          contenttable?: string | null;
          contentkey?: string | null;
          displayorder?: number | null;
          metadata?: Json | null;
          isactive?: boolean | null;
          updatedat?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          key: string;
          payment_id: string | null;
          merchant_id: string | null;
          status: string | null;
          plankey: string | null;
          schoolkey: string | null;
          amount: number | null;
          time: string | null;
          metadata: Json | null;
          createdat: string | null;
        };
        Insert: {
          key?: string;
          payment_id?: string | null;
          merchant_id?: string | null;
          status?: string | null;
          plankey?: string | null;
          schoolkey?: string | null;
          amount?: number | null;
          time?: string | null;
          metadata?: Json | null;
          createdat?: string | null;
        };
        Update: {
          key?: string;
          payment_id?: string | null;
          merchant_id?: string | null;
          status?: string | null;
          plankey?: string | null;
          schoolkey?: string | null;
          amount?: number | null;
          time?: string | null;
          metadata?: Json | null;
          createdat?: string | null;
        };
        Relationships: [];
      };
      formsubmissions: {
        Row: {
          idx: number;
          key: string;
          schoolkey: string;
          formtype: string;
          payload: Json;
          status: string;
          createdat: string;
          isactive: boolean;
        };
        Insert: {
          idx?: number;
          key?: string;
          schoolkey: string;
          formtype: string;
          payload: Json;
          status?: string;
          createdat?: string;
          isactive?: boolean;
        };
        Update: {
          idx?: number;
          key?: string;
          schoolkey?: string;
          formtype?: string;
          payload?: Json;
          status?: string;
          createdat?: string;
          isactive?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_admin_initial_data: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
