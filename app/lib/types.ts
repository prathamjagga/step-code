export interface TopicTag {
  name: string;
  slug?: string;
  __typename?: string;
  subtags?: string[];
}

export interface ProblemDetails {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionId: string;
  hasUserSubmission?: boolean;
}

export interface LeetCodeProblem {
  Rating: number;
  ID: number;
  Title: string;
  TitleZH: string;
  TitleSlug: string;
  ContestSlug: string;
  ProblemIndex: string;
  ContestID_en: string;
  ContestID_zh: string;
  topicTags?: TopicTag[];
  isEnhanced?: boolean;
  enhancedAt?: string;
  problemDetails?: ProblemDetails;
}



export const difficultyColors = {
  Easy: "text-green-700 bg-green-100 border-green-300 dark:text-green-300 dark:bg-green-900/30 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800/40",
  Medium: "text-yellow-700 bg-yellow-100 border-yellow-300 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-800/40", 
  Hard: "text-red-700 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-900/30 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/40"
};

export const tagColors = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-gray-100 text-gray-800",
  "bg-red-100 text-red-800",
];