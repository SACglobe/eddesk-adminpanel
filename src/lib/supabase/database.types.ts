export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academicresults: {
        Row: {
          createdat: string | null
          distinctions: number | null
          firstclass: number | null
          isactive: boolean | null
          key: string
          legacyquote: string | null
          passpercentage: number | null
          schoolkey: string | null
          year: number
        }
        Insert: {
          createdat?: string | null
          distinctions?: number | null
          firstclass?: number | null
          isactive?: boolean | null
          key?: string
          legacyquote?: string | null
          passpercentage?: number | null
          schoolkey?: string | null
          year: number
        }
        Update: {
          createdat?: string | null
          distinctions?: number | null
          firstclass?: number | null
          isactive?: boolean | null
          key?: string
          legacyquote?: string | null
          passpercentage?: number | null
          schoolkey?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "academicresults_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      academics: {
        Row: {
          boardtype: string | null
          createdat: string | null
          description: string | null
          highlight1: string | null
          highlight2: string | null
          highlight3: string | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          medium: string | null
          schoolkey: string | null
          standardfrom: number | null
          standardto: number | null
        }
        Insert: {
          boardtype?: string | null
          createdat?: string | null
          description?: string | null
          highlight1?: string | null
          highlight2?: string | null
          highlight3?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          medium?: string | null
          schoolkey?: string | null
          standardfrom?: number | null
          standardto?: number | null
        }
        Update: {
          boardtype?: string | null
          createdat?: string | null
          description?: string | null
          highlight1?: string | null
          highlight2?: string | null
          highlight3?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          medium?: string | null
          schoolkey?: string | null
          standardfrom?: number | null
          standardto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academics_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      activities: {
        Row: {
          createdat: string | null
          description: string | null
          displayorder: number | null
          highlightstat: string | null
          highlighttag: string | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          schoolkey: string | null
          tag: string | null
          title: string
        }
        Insert: {
          createdat?: string | null
          description?: string | null
          displayorder?: number | null
          highlightstat?: string | null
          highlighttag?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
          tag?: string | null
          title: string
        }
        Update: {
          createdat?: string | null
          description?: string | null
          displayorder?: number | null
          highlightstat?: string | null
          highlighttag?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
          tag?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      adminusers: {
        Row: {
          authuserid: string
          createdat: string | null
          email: string
          fullname: string | null
          isactive: boolean | null
          issuperadmin: boolean | null
          key: string
          phone: string | null
          role: string | null
          schoolkey: string | null
          status: string | null
          updatedat: string | null
        }
        Insert: {
          authuserid: string
          createdat?: string | null
          email: string
          fullname?: string | null
          isactive?: boolean | null
          issuperadmin?: boolean | null
          key?: string
          phone?: string | null
          role?: string | null
          schoolkey?: string | null
          status?: string | null
          updatedat?: string | null
        }
        Update: {
          authuserid?: string
          createdat?: string | null
          email?: string
          fullname?: string | null
          isactive?: boolean | null
          issuperadmin?: boolean | null
          key?: string
          phone?: string | null
          role?: string | null
          schoolkey?: string | null
          status?: string | null
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adminusers_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      admissioninstructions: {
        Row: {
          contactemail: string | null
          contactphone: string | null
          createdat: string | null
          description: string
          isactive: boolean | null
          key: string
          schoolkey: string | null
        }
        Insert: {
          contactemail?: string | null
          contactphone?: string | null
          createdat?: string | null
          description: string
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
        }
        Update: {
          contactemail?: string | null
          contactphone?: string | null
          createdat?: string | null
          description?: string
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissioninstructions_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      boardmembers: {
        Row: {
          createdat: string | null
          designation: string
          displayorder: number | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          name: string
          profile: string | null
          qualification: string | null
          schoolkey: string | null
        }
        Insert: {
          createdat?: string | null
          designation: string
          displayorder?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          name: string
          profile?: string | null
          qualification?: string | null
          schoolkey?: string | null
        }
        Update: {
          createdat?: string | null
          designation?: string
          displayorder?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          name?: string
          profile?: string | null
          qualification?: string | null
          schoolkey?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boardmembers_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      broadcastcontent: {
        Row: {
          createdat: string | null
          expiresat: string | null
          isactive: boolean | null
          key: string
          message: string
          priority: number | null
          schoolkey: string | null
          title: string
          updatedat: string | null
        }
        Insert: {
          createdat?: string | null
          expiresat?: string | null
          isactive?: boolean | null
          key?: string
          message: string
          priority?: number | null
          schoolkey?: string | null
          title: string
          updatedat?: string | null
        }
        Update: {
          createdat?: string | null
          expiresat?: string | null
          isactive?: boolean | null
          key?: string
          message?: string
          priority?: number | null
          schoolkey?: string | null
          title?: string
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcastcontent_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      componentregistry: {
        Row: {
          componentcode: string
          componentname: string
          createdat: string | null
          datatype: string
          isactive: boolean | null
          key: string
          supportsordering: boolean | null
        }
        Insert: {
          componentcode: string
          componentname: string
          createdat?: string | null
          datatype: string
          isactive?: boolean | null
          key?: string
          supportsordering?: boolean | null
        }
        Update: {
          componentcode?: string
          componentname?: string
          createdat?: string | null
          datatype?: string
          isactive?: boolean | null
          key?: string
          supportsordering?: boolean | null
        }
        Relationships: []
      }
      componentregistry_backup: {
        Row: {
          componentcode: string | null
          componentname: string | null
          createdat: string | null
          datatype: string | null
          isactive: boolean | null
          key: string | null
          supportsordering: boolean | null
          tablename: string | null
        }
        Insert: {
          componentcode?: string | null
          componentname?: string | null
          createdat?: string | null
          datatype?: string | null
          isactive?: boolean | null
          key?: string | null
          supportsordering?: boolean | null
          tablename?: string | null
        }
        Update: {
          componentcode?: string | null
          componentname?: string | null
          createdat?: string | null
          datatype?: string | null
          isactive?: boolean | null
          key?: string | null
          supportsordering?: boolean | null
          tablename?: string | null
        }
        Relationships: []
      }
      componenttype: {
        Row: {
          created_at: string
          description: string | null
          isactive: boolean | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          isactive?: boolean | null
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          isactive?: boolean | null
          type?: string
        }
        Relationships: []
      }
      contactdetails: {
        Row: {
          address: string | null
          createdat: string | null
          email: string | null
          facebook: string | null
          instagram: string | null
          isactive: boolean | null
          key: string
          mapembedurl: string | null
          phone: string | null
          schoolkey: string | null
          twitter: string | null
          youtube: string | null
        }
        Insert: {
          address?: string | null
          createdat?: string | null
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          isactive?: boolean | null
          key?: string
          mapembedurl?: string | null
          phone?: string | null
          schoolkey?: string | null
          twitter?: string | null
          youtube?: string | null
        }
        Update: {
          address?: string | null
          createdat?: string | null
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          isactive?: boolean | null
          key?: string
          mapembedurl?: string | null
          phone?: string | null
          schoolkey?: string | null
          twitter?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contactdetails_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          createdat: string | null
          description: string | null
          endtime: string | null
          eventdate: string | null
          imageurl: string | null
          isactive: boolean | null
          isfeatured: boolean | null
          key: string
          location: string | null
          schoolkey: string | null
          starttime: string | null
          title: string
        }
        Insert: {
          category?: string | null
          createdat?: string | null
          description?: string | null
          endtime?: string | null
          eventdate?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          isfeatured?: boolean | null
          key?: string
          location?: string | null
          schoolkey?: string | null
          starttime?: string | null
          title: string
        }
        Update: {
          category?: string | null
          createdat?: string | null
          description?: string | null
          endtime?: string | null
          eventdate?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          isfeatured?: boolean | null
          key?: string
          location?: string | null
          schoolkey?: string | null
          starttime?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      faculty: {
        Row: {
          createdat: string | null
          description: string | null
          designation: string | null
          displayorder: number | null
          email: string | null
          experience_years: number | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          name: string
          phone: string | null
          qualification: string | null
          schoolkey: string | null
        }
        Insert: {
          createdat?: string | null
          description?: string | null
          designation?: string | null
          displayorder?: number | null
          email?: string | null
          experience_years?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          name: string
          phone?: string | null
          qualification?: string | null
          schoolkey?: string | null
        }
        Update: {
          createdat?: string | null
          description?: string | null
          designation?: string | null
          displayorder?: number | null
          email?: string | null
          experience_years?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          name?: string
          phone?: string | null
          qualification?: string | null
          schoolkey?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      formsubmissions: {
        Row: {
          createdat: string | null
          formtype: string
          isactive: boolean | null
          key: string
          payload: Json
          schoolkey: string | null
          status: string | null
        }
        Insert: {
          createdat?: string | null
          formtype: string
          isactive?: boolean | null
          key?: string
          payload: Json
          schoolkey?: string | null
          status?: string | null
        }
        Update: {
          createdat?: string | null
          formtype?: string
          isactive?: boolean | null
          key?: string
          payload?: Json
          schoolkey?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formsubmissions_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      gallery: {
        Row: {
          caption: string | null
          category: string | null
          contenttype: string | null
          createdat: string | null
          displayorder: number | null
          isactive: boolean | null
          isfeatured: boolean | null
          key: string
          schoolkey: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          contenttype?: string | null
          createdat?: string | null
          displayorder?: number | null
          isactive?: boolean | null
          isfeatured?: boolean | null
          key?: string
          schoolkey?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          contenttype?: string | null
          createdat?: string | null
          displayorder?: number | null
          isactive?: boolean | null
          isfeatured?: boolean | null
          key?: string
          schoolkey?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      herocontent: {
        Row: {
          contenttype: string
          createdat: string | null
          displayorder: number | null
          headline: string
          isactive: boolean | null
          key: string
          mediaurl: string
          primarybuttontext: string | null
          primarybuttonurl: string | null
          schoolkey: string | null
          screenslug: string
          secondarybuttontext: string | null
          secondarybuttonurl: string | null
          subheadline: string | null
          updatedat: string
        }
        Insert: {
          contenttype: string
          createdat?: string | null
          displayorder?: number | null
          headline: string
          isactive?: boolean | null
          key?: string
          mediaurl: string
          primarybuttontext?: string | null
          primarybuttonurl?: string | null
          schoolkey?: string | null
          screenslug: string
          secondarybuttontext?: string | null
          secondarybuttonurl?: string | null
          subheadline?: string | null
          updatedat?: string
        }
        Update: {
          contenttype?: string
          createdat?: string | null
          displayorder?: number | null
          headline?: string
          isactive?: boolean | null
          key?: string
          mediaurl?: string
          primarybuttontext?: string | null
          primarybuttonurl?: string | null
          schoolkey?: string | null
          screenslug?: string
          secondarybuttontext?: string | null
          secondarybuttonurl?: string | null
          subheadline?: string | null
          updatedat?: string
        }
        Relationships: [
          {
            foreignKeyName: "herocontent_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      infrastructure: {
        Row: {
          contenttype: string | null
          createdat: string | null
          description: string | null
          displayorder: number | null
          highlightdescription: string | null
          highlighttitle: string | null
          icon: string | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          schoolkey: string | null
          tag: string | null
          title: string
        }
        Insert: {
          contenttype?: string | null
          createdat?: string | null
          description?: string | null
          displayorder?: number | null
          highlightdescription?: string | null
          highlighttitle?: string | null
          icon?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
          tag?: string | null
          title: string
        }
        Update: {
          contenttype?: string | null
          createdat?: string | null
          description?: string | null
          displayorder?: number | null
          highlightdescription?: string | null
          highlighttitle?: string | null
          icon?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
          tag?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      leadership: {
        Row: {
          createdat: string | null
          designation: string | null
          displayorder: number | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          message: string
          name: string
          role: string | null
          schoolkey: string | null
          signatureurl: string | null
        }
        Insert: {
          createdat?: string | null
          designation?: string | null
          displayorder?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          message: string
          name: string
          role?: string | null
          schoolkey?: string | null
          signatureurl?: string | null
        }
        Update: {
          createdat?: string | null
          designation?: string | null
          displayorder?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          message?: string
          name?: string
          role?: string | null
          schoolkey?: string | null
          signatureurl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leadershipmessages_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      plans: {
        Row: {
          billgenerationdate: number | null
          billingcycle: string
          code: string
          createdat: string | null
          currency: string
          description: string | null
          graceperiod: number | null
          isactive: boolean | null
          key: string
          name: string
          price: number
        }
        Insert: {
          billgenerationdate?: number | null
          billingcycle: string
          code: string
          createdat?: string | null
          currency?: string
          description?: string | null
          graceperiod?: number | null
          isactive?: boolean | null
          key?: string
          name: string
          price: number
        }
        Update: {
          billgenerationdate?: number | null
          billingcycle?: string
          code?: string
          createdat?: string | null
          currency?: string
          description?: string | null
          graceperiod?: number | null
          isactive?: boolean | null
          key?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      referencedata: {
        Row: {
          created_at: string
          isactive: boolean | null
          key: string
          label: string | null
          tablename: string | null
          tags: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          isactive?: boolean | null
          key?: string
          label?: string | null
          tablename?: string | null
          tags?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          isactive?: boolean | null
          key?: string
          label?: string | null
          tablename?: string | null
          tags?: string | null
          value?: string | null
        }
        Relationships: []
      }
      schoolachievements: {
        Row: {
          awardlevel: string | null
          category: string | null
          createdat: string | null
          description: string | null
          displayorder: number | null
          imageurl: string | null
          isactive: boolean | null
          isfeatured: boolean | null
          key: string
          schoolkey: string | null
          title: string
          year: number | null
        }
        Insert: {
          awardlevel?: string | null
          category?: string | null
          createdat?: string | null
          description?: string | null
          displayorder?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          isfeatured?: boolean | null
          key?: string
          schoolkey?: string | null
          title: string
          year?: number | null
        }
        Update: {
          awardlevel?: string | null
          category?: string | null
          createdat?: string | null
          description?: string | null
          displayorder?: number | null
          imageurl?: string | null
          isactive?: boolean | null
          isfeatured?: boolean | null
          key?: string
          schoolkey?: string | null
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      schoolidentity: {
        Row: {
          createdat: string | null
          founded_year: number | null
          history: string | null
          isactive: boolean | null
          key: string
          mission: string
          motto: string | null
          schoolkey: string | null
          updatedat: string | null
          vision: string
        }
        Insert: {
          createdat?: string | null
          founded_year?: number | null
          history?: string | null
          isactive?: boolean | null
          key?: string
          mission: string
          motto?: string | null
          schoolkey?: string | null
          updatedat?: string | null
          vision: string
        }
        Update: {
          createdat?: string | null
          founded_year?: number | null
          history?: string | null
          isactive?: boolean | null
          key?: string
          mission?: string
          motto?: string | null
          schoolkey?: string | null
          updatedat?: string | null
          vision?: string
        }
        Relationships: [
          {
            foreignKeyName: "schoolidentity_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          componentvariants: Json | null
          country: string | null
          createdat: string | null
          customdomain: string | null
          email: string | null
          isactive: boolean | null
          isdemo: boolean | null
          key: string
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          slug: string | null
          state: string | null
          templatekey: string | null
          templateslug: string | null
          themeconfig: Json | null
          updatedat: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          componentvariants?: Json | null
          country?: string | null
          createdat?: string | null
          customdomain?: string | null
          email?: string | null
          isactive?: boolean | null
          isdemo?: boolean | null
          key?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          templatekey?: string | null
          templateslug?: string | null
          themeconfig?: Json | null
          updatedat?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          componentvariants?: Json | null
          country?: string | null
          createdat?: string | null
          customdomain?: string | null
          email?: string | null
          isactive?: boolean | null
          isdemo?: boolean | null
          key?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          templatekey?: string | null
          templateslug?: string | null
          themeconfig?: Json | null
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_templatekey_fkey"
            columns: ["templatekey"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["key"]
          },
        ]
      }
      schoolstats: {
        Row: {
          createdat: string | null
          displayorder: number | null
          icon: string | null
          isactive: boolean | null
          key: string
          label: string
          schoolkey: string | null
          value: string
        }
        Insert: {
          createdat?: string | null
          displayorder?: number | null
          icon?: string | null
          isactive?: boolean | null
          key?: string
          label: string
          schoolkey?: string | null
          value: string
        }
        Update: {
          createdat?: string | null
          displayorder?: number | null
          icon?: string | null
          isactive?: boolean | null
          key?: string
          label?: string
          schoolkey?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "schoolstats_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      studentachievements: {
        Row: {
          achievementtypekey: string | null
          categorykey: string | null
          createdat: string | null
          description: string | null
          imageurl: string | null
          isactive: boolean | null
          key: string
          rank: number | null
          schoolkey: string | null
          score: string | null
          studentclass: string | null
          studentname: string
          title: string | null
          year: number | null
        }
        Insert: {
          achievementtypekey?: string | null
          categorykey?: string | null
          createdat?: string | null
          description?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          rank?: number | null
          schoolkey?: string | null
          score?: string | null
          studentclass?: string | null
          studentname: string
          title?: string | null
          year?: number | null
        }
        Update: {
          achievementtypekey?: string | null
          categorykey?: string | null
          createdat?: string | null
          description?: string | null
          imageurl?: string | null
          isactive?: boolean | null
          key?: string
          rank?: number | null
          schoolkey?: string | null
          score?: string | null
          studentclass?: string | null
          studentname?: string
          title?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studentachievements_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      subscriptions: {
        Row: {
          createdat: string | null
          enddate: string | null
          isactive: boolean | null
          key: string
          plankey: string
          schoolkey: string
          startdate: string | null
          status: string | null
          updatedat: string | null
        }
        Insert: {
          createdat?: string | null
          enddate?: string | null
          isactive?: boolean | null
          key?: string
          plankey: string
          schoolkey: string
          startdate?: string | null
          status?: string | null
          updatedat?: string | null
        }
        Update: {
          createdat?: string | null
          enddate?: string | null
          isactive?: boolean | null
          key?: string
          plankey?: string
          schoolkey?: string
          startdate?: string | null
          status?: string | null
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plankey_fkey"
            columns: ["plankey"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "subscriptions_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      templatecomponents: {
        Row: {
          componentregistrykey: string | null
          config: Json | null
          createdat: string | null
          displayorder: number
          isactive: boolean | null
          iseditable: boolean | null
          isrequired: boolean | null
          key: string
          templatescreenkey: string | null
        }
        Insert: {
          componentregistrykey?: string | null
          config?: Json | null
          createdat?: string | null
          displayorder: number
          isactive?: boolean | null
          iseditable?: boolean | null
          isrequired?: boolean | null
          key?: string
          templatescreenkey?: string | null
        }
        Update: {
          componentregistrykey?: string | null
          config?: Json | null
          createdat?: string | null
          displayorder?: number
          isactive?: boolean | null
          iseditable?: boolean | null
          isrequired?: boolean | null
          key?: string
          templatescreenkey?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_componentkey"
            columns: ["componentregistrykey"]
            isOneToOne: false
            referencedRelation: "componentregistry"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "templatecomponents_templatescreenkey_fkey"
            columns: ["templatescreenkey"]
            isOneToOne: false
            referencedRelation: "templatescreens"
            referencedColumns: ["key"]
          },
        ]
      }
      templatecomponents_backup: {
        Row: {
          alloweditemcount: number | null
          componentcode: string | null
          componentregistrykey: string | null
          componenttype: string | null
          createdat: string | null
          displayorder: number | null
          filtermethod: string | null
          isactive: boolean | null
          iseditable: boolean | null
          isrequired: boolean | null
          key: string | null
          templatescreenkey: string | null
          validationconfig: Json | null
        }
        Insert: {
          alloweditemcount?: number | null
          componentcode?: string | null
          componentregistrykey?: string | null
          componenttype?: string | null
          createdat?: string | null
          displayorder?: number | null
          filtermethod?: string | null
          isactive?: boolean | null
          iseditable?: boolean | null
          isrequired?: boolean | null
          key?: string | null
          templatescreenkey?: string | null
          validationconfig?: Json | null
        }
        Update: {
          alloweditemcount?: number | null
          componentcode?: string | null
          componentregistrykey?: string | null
          componenttype?: string | null
          createdat?: string | null
          displayorder?: number | null
          filtermethod?: string | null
          isactive?: boolean | null
          iseditable?: boolean | null
          isrequired?: boolean | null
          key?: string | null
          templatescreenkey?: string | null
          validationconfig?: Json | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          code: string
          createdat: string | null
          description: string | null
          isactive: boolean | null
          key: string
          name: string
          templateslug: string | null
        }
        Insert: {
          code: string
          createdat?: string | null
          description?: string | null
          isactive?: boolean | null
          key?: string
          name: string
          templateslug?: string | null
        }
        Update: {
          code?: string
          createdat?: string | null
          description?: string | null
          isactive?: boolean | null
          key?: string
          name?: string
          templateslug?: string | null
        }
        Relationships: []
      }
      templatescreens: {
        Row: {
          createdat: string | null
          displayorder: number
          isactive: boolean | null
          key: string
          route: string
          screenslug: string
          templatekey: string | null
        }
        Insert: {
          createdat?: string | null
          displayorder: number
          isactive?: boolean | null
          key?: string
          route: string
          screenslug: string
          templatekey?: string | null
        }
        Update: {
          createdat?: string | null
          displayorder?: number
          isactive?: boolean | null
          key?: string
          route?: string
          screenslug?: string
          templatekey?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templatescreens_templatekey_fkey"
            columns: ["templatekey"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["key"]
          },
        ]
      }
      testimonialcontent: {
        Row: {
          authorname: string
          createdat: string | null
          designation: string | null
          displayorder: number | null
          isactive: boolean | null
          key: string
          message: string
          photo_url: string | null
          rating: number | null
          schoolkey: string | null
        }
        Insert: {
          authorname: string
          createdat?: string | null
          designation?: string | null
          displayorder?: number | null
          isactive?: boolean | null
          key?: string
          message: string
          photo_url?: string | null
          rating?: number | null
          schoolkey?: string | null
        }
        Update: {
          authorname?: string
          createdat?: string | null
          designation?: string | null
          displayorder?: number | null
          isactive?: boolean | null
          key?: string
          message?: string
          photo_url?: string | null
          rating?: number | null
          schoolkey?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonialcontent_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
      whychooseus: {
        Row: {
          createdat: string | null
          description: string
          displayorder: number | null
          icon: string | null
          isactive: boolean | null
          key: string
          schoolkey: string | null
          title: string
        }
        Insert: {
          createdat?: string | null
          description: string
          displayorder?: number | null
          icon?: string | null
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
          title: string
        }
        Update: {
          createdat?: string | null
          description?: string
          displayorder?: number | null
          icon?: string | null
          isactive?: boolean | null
          key?: string
          schoolkey?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "whychooseus_schoolkey_fkey"
            columns: ["schoolkey"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      createadmininvite: {
        Args: {
          pauthuserid: string
          pemail: string
          pfullname: string
          pphone: string
          prole: string
          pschoolkey: string
        }
        Returns: Json
      }
      get_admin_initial_data: { Args: never; Returns: Json }
      get_screen_data: {
        Args: {
          p_domain: string
          p_screen_slug: string
          p_template_slug?: string
        }
        Returns: Json
      }
      get_template_screens_with_components: {
        Args: { p_templatekey: string }
        Returns: Json
      }
      get_templates_full_structure: { Args: never; Returns: Json }
    }
    Enums: {
      componentenumtype: "singleitem" | "multipleitem"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      componentenumtype: ["singleitem", "multipleitem"],
    },
  },
} as const
