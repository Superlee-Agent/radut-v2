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
  ai_generation_analysis: AIGenerationAnalysis;
  content_analysis: ContentAnalysis;
  composition_analysis: CompositionAnalysis;
  object_detection: ObjectDetection;
  text_detection: TextDetection;
  is_photo: boolean;
  is_animation: boolean;
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
  const {
    ai_generation_analysis,
    content_analysis,
    is_photo,
    is_animation,
    has_human_face,
    is_full_face_visible,
    is_famous_person,
    has_known_brand_or_character,
  } = flags;

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

  // Derive a simple boolean for logic from the detailed analysis. 'Unlikely' and 'Low' are treated as not AI.
  const is_ai_generated =
    ai_generation_analysis.likelihood === "High" ||
    ai_generation_analysis.likelihood === "Medium";

  // --- Animation Branch ---
  if (is_animation) {
    if (is_ai_generated) {
      // AI Animation
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
      // Non-AI Animation (e.g., traditional cartoon, CGI render)
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

  // --- AI Image Branch ---
  if (is_ai_generated) {
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

  // --- Photograph Branch ---
  if (is_photo) {
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

  // Fallback: If it's none of the above (e.g., abstract art, not explicitly photo or AI),
  // classify as a simple AI-like image to be safe.
  return {
    group: 1,
    type: "Unclassified Image",
    classification: "No Faces or Brands",
  };
}

export function getLicenseSettings(group: GroupNumber): LicenseSettings {
  switch (group) {
    // CAN REGISTER
    case 1:
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
    case 5:
    case 10:
      return {
        status: RegistrationStatus.REQUIRES_REVIEW,
        title: "Requires Review",
        description:
          "This image contains a full, identifiable face of a non-famous person. A model release or selfie verification is required to proceed with registration.",
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
