export interface EurojackpotHistoricOdds {
  eurojackpotGameCycle: {
    cycleNo: number;
    cycleYear: number;
    eventDate: number;
    eventWeekday: number;
    gametableValidFrom: number | null; // Timestamp or null
    gametableValidTo: number | null;   // Timestamp or null
    key: string;
    variantNo: number;
  };
  eurojackpotOdds: WinningClass[];
  eurojackpotTurnover: Turnover[];
}

export interface WinningClass {
  amount: number;
  numberOfWins: number;
  winningClass: number;
  sequence: number;
  jackpot: boolean;
}

export interface Turnover {
  amount: number;
  jurisdiction: number;
}