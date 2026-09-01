/**
 * Hand-written mirror of supabase/migrations. Regenerate from the live project
 * with `npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts`
 * once you have the CLI linked; until then keep this in step with the migrations.
 */

export type Database = {
  public: {
    Tables: {
      app_members: {
        Row: {
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          member_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          member_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          member_email?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_member_email_fkey";
            columns: ["member_email"];
            isOneToOne: true;
            referencedRelation: "app_members";
            referencedColumns: ["email"];
          },
        ];
      };
      seasons: {
        Row: {
          id: string;
          name: string;
          started_on: string;
          ended_on: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          started_on?: string;
          ended_on?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          started_on?: string;
          ended_on?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          season_id: string;
          played_at: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          played_at?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          played_at?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      match_players: {
        Row: {
          match_id: string;
          player_id: string;
          points: number;
        };
        Insert: {
          match_id: string;
          player_id: string;
          points: number;
        };
        Update: {
          match_id?: string;
          player_id?: string;
          points?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      season_standings: {
        Row: {
          season_id: string;
          player_id: string;
          player_name: string;
          is_active: boolean;
          matches_played: number;
          wins: number;
          draws: number;
          losses: number;
          points_scored: number;
          best_score: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_match: {
        Args: {
          p_season_id: string;
          p_players: string[];
          p_points: number[];
          p_played_at?: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      create_season: {
        Args: {
          p_name: string;
          p_started_on?: string;
        };
        Returns: string;
      };
      activate_season: {
        Args: { p_season_id: string };
        Returns: undefined;
      };
      close_season: {
        Args: { p_season_id: string };
        Returns: undefined;
      };
      is_member: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      ensure_member_player: {
        Args: { p_email: string; p_display_name: string | null };
        Returns: string;
      };
    };
  };
};

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Season = Database["public"]["Tables"]["seasons"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type AppMember = Database["public"]["Tables"]["app_members"]["Row"];
export type StandingsRow = Database["public"]["Views"]["season_standings"]["Row"];

/** A match with its scorers resolved to player names, as the match list renders it. */
export type MatchWithPlayers = Match & {
  match_players: Array<{
    points: number;
    players: Pick<Player, "id" | "name"> | null;
  }>;
};
