export interface IzanamiContext {
  id?: string;
  context?: { [x: string]: any };
  executionContext?: string; 
}

export interface IzanamiResponse {
  active: boolean;
}