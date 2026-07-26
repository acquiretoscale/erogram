export interface AINsfwFeatureHighlight {
  title: string;
  body: string;
}

export interface AINsfwReviewSection {
  heading: string;
  body: string;
}

export interface AINsfwReviewAlternative {
  name: string;
  slug: string;
}

export interface AINsfwFullReview {
  shortDescription: string;
  featureHighlights: AINsfwFeatureHighlight[];
  sections: AINsfwReviewSection[];
  alternatives?: AINsfwReviewAlternative[];
}
