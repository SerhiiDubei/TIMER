// Database types
export type RoomStatus = 'lobby' | 'running' | 'finished';

export type EffectType = 'self_add' | 'self_subtract' | 'steal' | 'team_add' | 'temptation';

export type EventType = 'time_adjust' | 'code_used' | 'game_started' | 'player_eliminated' | 'player_joined';

export interface Room {
  id: string;
  room_code: string;
  status: RoomStatus;
  admin_key: string;
  created_at: string;
  started_at: string | null;
  base_seconds: number;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  joined_at: string;
  is_admin: boolean;
  eliminated_at: string | null;
  last_seen_at: string | null;
}

export interface Code {
  id: string;
  room_id: string;
  code_hash: string;
  effect_type: EffectType;
  payload: any;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by_player_id: string | null;
}

export interface Event {
  id: string;
  room_id: string;
  created_at: string;
  type: EventType;
  actor_player_id: string | null;
  target_player_id: string | null;
  payload: any;
  time_delta_seconds: number;
}

// API request/response types
export interface CreateRoomResponse {
  room_code: string;
  admin_key: string;
  room_id: string;
}

export interface JoinRoomRequest {
  room_code: string;
  name: string;
}

export interface JoinRoomResponse {
  room_id: string;
  player_id: string;
  player: Player;
}

export interface StartGameRequest {
  room_id: string;
  admin_key: string;
}

export interface RoomState {
  room: Room;
  players: Player[];
  recent_events: Event[];
  my_remaining?: number;
  my_adjustments?: number;
}

export interface RedeemCodeRequest {
  room_id: string;
  player_id: string;
  code: string;
}

export interface RedeemCodeResponse {
  success: boolean;
  remaining?: number;
  message?: string;
  events?: Event[];
}

export interface GenerateCodesRequest {
  room_id: string;
  admin_key: string;
  batch: Array<{
    effect_type: EffectType;
    payload: any;
    expires_at?: string;
  }>;
}

export interface GenerateCodesResponse {
  codes: string[];
}

// Realtime message types
export interface RealtimeMessage {
  type: 'player_joined' | 'game_started' | 'code_used' | 'player_eliminated' | 'state_update';
  payload: any;
}

// Code effect payloads
export interface SelfAddPayload {
  seconds: number;
}

export interface SelfSubtractPayload {
  seconds: number;
}

export interface StealPayload {
  from_player_id: string;
  seconds: number;
}

export interface TeamAddPayload {
  seconds: number;
  scope: 'all' | 'list';
  player_ids?: string[];
}

export interface TemptationOption {
  nPlayers: number;
  seconds: number;
}

export interface TemptationPayload {
  options: TemptationOption[];
  ttlSeconds: number;
}
