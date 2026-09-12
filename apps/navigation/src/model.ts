export interface Site {
  iconDataUrl?: string;
  iconUrl?: string;
  group?: string;
  section?: "websites" | "downloads";
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
  icon: string;
}
