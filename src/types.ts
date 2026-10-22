export interface TileCoordinate {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
}

export interface RenderSuccess {
  status: "success";
  id: string;
  label?: string;
  source?: string;
  coordinate: string;
  resolved: TileCoordinate;
  imageUrl?: string;
}

export interface RenderFailure {
  status: "failure";
  id: string;
  label?: string;
  source?: string;
  coordinate: string;
  error: string;
}

export type RenderResult = RenderSuccess | RenderFailure;

export interface RenderManifest {
  tileBaseUrl: string;
  generatedAt: string;
  renderCount: number;
  failedCount: number;
  omittedCount: number;
  items: RenderResult[];
}

export interface RenderServiceResponse {
  renderCount: number;
  failedCount: number;
  items: RenderResult[];
}
