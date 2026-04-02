export interface GameScoreUserDetail {
  username: string;
  useremail: string;
  highestscore: number;
  currentscore: number;
}

export interface GameScoreUsersDetailsResponse {
  success?: boolean;
  data: GameScoreUserDetail[];
}

