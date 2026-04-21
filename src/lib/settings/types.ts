/** Stored in encrypted vault cookie (server-side). */
export type IntegrationsVaultV1 = {
  version: 1;
  seatsAeroApiKey?: string;
  alaskaMileagePlan?: string;
  americanAAdvantage?: string;
  unitedMileagePlus?: string;
  deltaSkyMiles?: string;
  marriottBonvoy?: string;
  hiltonHonors?: string;
  worldOfHyatt?: string;
  /** Free-form reminders (e.g. which card is linked); keep non-secret. */
  notes?: string;
};

export type IntegrationsMasked = {
  seatsAeroApiKey: boolean;
  alaskaMileagePlan: boolean;
  americanAAdvantage: boolean;
  unitedMileagePlus: boolean;
  deltaSkyMiles: boolean;
  marriottBonvoy: boolean;
  hiltonHonors: boolean;
  worldOfHyatt: boolean;
  notes: boolean;
  /** Last 2–4 chars for display, never full secrets */
  preview: Partial<Record<keyof IntegrationsVaultV1, string>>;
};
