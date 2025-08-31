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
  Easy: "text-green-600 bg-green-50 border-green-200",
  Medium: "text-yellow-600 bg-yellow-50 border-yellow-200", 
  Hard: "text-red-600 bg-red-50 border-red-200"
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