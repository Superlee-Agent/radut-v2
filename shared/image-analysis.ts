// Types
export interface AIGenerationAnalysis {
  likelihood: "High" | "Medium" | "Low" | "Unlikely";
  evidence: string[];
  confidence_score: number;
}

export interface ContentAnalysis {
  contains_explicit_content: boolean;
  contains_violence: boolean;
  contains_sensitive_subject: boolean;
  description: string;
}

export interface CompositionAnalysis {
  style: string;
  perspective: string;
  dominant_colors: string[];
}

export interface ObjectDetection {
  main_objects: string[];
}

export interface TextDetection {
  detected_text: string;
}

export interface ImageAnalysisFlags {
  primary_category:
    | "Photograph"
    | "AI-Generated Image"
    | "Animation/CGI"
    | "Uncertain";
  ai_generation_analysis: AIGenerationAnalysis;
  content_analysis: ContentAnalysis;
  composition_analysis: CompositionAnalysis;
  object_detection: ObjectDetection;
  text_detection: TextDetection;
  has_human_face: boolean;
  is_full_face_visible: boolean;
  is_famous_person: boolean;
  has_known_brand_or_character: boolean;
  title: string;
  description: string;
}

export type GroupNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16;

export interface GroupClassification {
  group: GroupNumber;
  type: string;
  classification: string;
}

export enum RegistrationStatus {
  CAN_REGISTER = "CAN_REGISTER",
  CANNOT_REGISTER = "CANNOT_REGISTER",
  REQUIRES_REVIEW = "REQUIRES_REVIEW",
}

export interface LicenseSettings {
  status: RegistrationStatus;
  title: string;
  description: string;
  buttonText: string;
  color: "green" | "red" | "yellow";
}

export interface ClassificationResult {
  flags: ImageAnalysisFlags;
  classification: GroupClassification;
  license: LicenseSettings;
}

// Classification Logic
export function classifyImage(flags: ImageAnalysisFlags): GroupClassification {
  let {
    primary_category,
    ai_generation_analysis,
    content_analysis,
    has_human_face,
    is_full_face_visible,
    is_famous_person,
    has_known_brand_or_character,
  } = flags;

  // Validate consistency: primary_category should match AI likelihood
  // If AI likelihood is "Unlikely" or "Low", it should be a Photograph, not AI-Generated
  if (
    (ai_generation_analysis.likelihood === "Unlikely" ||
      ai_generation_analysis.likelihood === "Low") &&
    primary_category === "AI-Generated Image"
  ) {
    primary_category = "Photograph";
  }
  // If AI likelihood is "High" or "Medium", it should be AI-Generated Image, not Photograph
  else if (
    (ai_generation_analysis.likelihood === "High" ||
      ai_generation_analysis.likelihood === "Medium") &&
    primary_category === "Photograph"
  ) {
    primary_category = "AI-Generated Image";
  }

  // High-priority check: If content is sensitive, it's an automatic rejection regardless of other factors.
  if (
    content_analysis.contains_explicit_content ||
    content_analysis.contains_violence ||
    content_analysis.contains_sensitive_subject
  ) {
    return {
      group: 15,
      type: "Restricted Content",
      classification: "Contains sensitive or explicit material",
    };
  }

  switch (primary_category) {
    case "Animation/CGI": {
      const is_ai_animation =
        ai_generation_analysis.likelihood === "High" ||
        ai_generation_analysis.likelihood === "Medium";
      if (is_ai_animation) {
        return has_known_brand_or_character
          ? {
              group: 13,
              type: "AI Animation",
              classification: "Contains Brand/Character",
            }
          : {
              group: 12,
              type: "AI Animation",
              classification: "No Brand/Character",
            };
      } else {
        // Non-AI Animation (e.g., traditional cartoon, manual CGI render)
        return has_known_brand_or_character
          ? {
              group: 15,
              type: "Non-AI Animation",
              classification: "Contains Brand/Character",
            }
          : {
              group: 14,
              type: "Non-AI Animation",
              classification: "No Brand/Character",
            };
      }
    }

    case "AI-Generated Image": {
      if (has_known_brand_or_character) {
        return {
          group: 2,
          type: "AI Image",
          classification: "Contains Brand/Character",
        };
      }
      if (!has_human_face) {
        return {
          group: 1,
          type: "AI Image",
          classification: "No Faces or Brands",
        };
      }
      // Has a human face
      if (is_famous_person) {
        return is_full_face_visible
          ? {
              group: 3,
              type: "AI Image",
              classification: "Famous Person (Full Face)",
            }
          : {
              group: 4,
              type: "AI Image",
              classification: "Famous Person (Partial Face)",
            };
      } else {
        // Regular person
        return is_full_face_visible
          ? {
              group: 5,
              type: "AI Image",
              classification: "Regular Person (Full Face)",
            }
          : {
              group: 6,
              type: "AI Image",
              classification: "Regular Person (Partial Face)",
            };
      }
    }

    case "Photograph": {
      if (has_known_brand_or_character) {
        return {
          group: 7,
          type: "Photograph",
          classification: "Contains Brand/Character",
        };
      }
      if (!has_human_face) {
        return {
          group: 16,
          type: "Photograph",
          classification: "No Faces or Brands",
        };
      }
      // Has a human face
      if (is_famous_person) {
        return is_full_face_visible
          ? {
              group: 8,
              type: "Photograph",
              classification: "Famous Person (Full Face)",
            }
          : {
              group: 9,
              type: "Photograph",
              classification: "Famous Person (Partial Face)",
            };
      } else {
        // Regular person
        return is_full_face_visible
          ? {
              group: 10,
              type: "Photograph",
              classification: "Regular Person (Full Face)",
            }
          : {
              group: 11,
              type: "Photograph",
              classification: "Regular Person (Partial Face)",
            };
      }
    }

    case "Uncertain":
    default:
      // Fallback: If the AI is uncertain, treat it with the caution of an AI image.
      return {
        group: 1,
        type: "Uncertain Origin",
        classification: "Requires manual review",
      };
  }
}

export function getLicenseSettings(group: GroupNumber): LicenseSettings {
  switch (group) {
    // CAN REGISTER
    case 4:
    case 6:
    case 12:
      return {
        status: RegistrationStatus.CAN_REGISTER,
        title: "Ready to Register",
        description:
          "This image meets the criteria for direct registration. No AI training is permitted with this license.",
        buttonText: "Register Image",
        color: "green",
      };
    case 9:
    case 11:
    case 14:
    case 16:
      return {
        status: RegistrationStatus.CAN_REGISTER,
        title: "Ready to Register",
        description:
          "This image meets the criteria for direct registration. Manual AI training is permitted with this license.",
        buttonText: "Register Image",
        color: "green",
      };

    // CANNOT REGISTER
    case 2:
    case 3:
    case 7:
    case 8:
    case 13:
    case 15:
      return {
        status: RegistrationStatus.CANNOT_REGISTER,
        title: "Cannot Register",
        description:
          "This image contains elements (e.g., brands, characters, faces of famous people, or restricted content) that prevent registration due to potential IP or right-of-publicity conflicts.",
        buttonText: "Cannot Register",
        color: "red",
      };

    // REQUIRES REVIEW
    case 1:
    case 5:
    case 10:
      return {
        status: RegistrationStatus.REQUIRES_REVIEW,
        title: "Requires Review",
        description:
          "This image requires manual review. AI-generated content without faces (Group 1) needs verification, and images with identifiable faces (Groups 5, 10) require a model release.",
        buttonText: "Start Review Process",
        color: "yellow",
      };

    default:
      // Fallback for any unhandled group
      return {
        status: RegistrationStatus.CANNOT_REGISTER,
        title: "Classification Error",
        description: "Could not determine registration status for this group.",
        buttonText: "Error",
        color: "red",
      };
  }
}
