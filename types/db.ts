export type QrCode = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  name: string;
  slug: string;
  destination_url: string;
  campaign: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QrFolder = {
  id: string;
  owner_id: string;
  name: string;
  name_normalized: string;
  created_at: string;
  updated_at: string;
};

export type QrScan = {
  id: number;
  qr_code_id: string;
  created_at: string;
  referrer: string | null;
  user_agent: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
};
