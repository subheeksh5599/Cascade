export type OracleType = "github" | "strava" | "manual";

export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  oracle: OracleType;
  oracleParams: string;
  deadline: string;
  stakeAmount: string;
  penaltyPercent: number;
  penaltyRecipient: string;
  creator: string;
  currentProgress: number;
  status: "active" | "success" | "failed";
  image: string;
}

export const ACTIVE_GOALS: Goal[] = [
  {
    id: "ship-5-prs",
    title: "Ship 5 PRs This Week",
    description: "Merge 5 pull requests into the core repo before the deadline or my stake goes to charity.",
    target: 5,
    unit: "PRs merged",
    oracle: "github",
    oracleParams: "yashpunmiya/Flowvault",
    deadline: "6d 14h remaining",
    stakeAmount: "500,000",
    penaltyPercent: 100,
    penaltyRecipient: "ST35GP7N96HNGD9CYEBKBGFKKCWRBYKZX9QJ90YR",
    creator: "ST1SJ...3M3",
    currentProgress: 3,
    status: "active",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=800&fit=crop&q=80",
  },
  {
    id: "run-50km",
    title: "Run 50km This Month",
    description: "Complete 50km of running in June. If I fail, my stake funds a local running charity.",
    target: 50,
    unit: "kilometers",
    oracle: "strava",
    oracleParams: "athlete/12345",
    deadline: "12d 3h remaining",
    stakeAmount: "200,000",
    penaltyPercent: 80,
    penaltyRecipient: "ST2GZQXJ7FQK8MZYWN1SEPKWYB3FFWFYBRBNK59P",
    creator: "ST2GZ...K59P",
    currentProgress: 34,
    status: "active",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=800&fit=crop&q=80",
  },
  {
    id: "post-10-threads",
    title: "Post 10 X Threads",
    description: "Write and publish 10 high-quality threads on X about Stacks development.",
    target: 10,
    unit: "threads",
    oracle: "manual",
    oracleParams: "verifier:ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    deadline: "4d 22h remaining",
    stakeAmount: "150,000",
    penaltyPercent: 100,
    penaltyRecipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    creator: "ST3AB...M8X",
    currentProgress: 7,
    status: "active",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=800&fit=crop&q=80",
  },
];
