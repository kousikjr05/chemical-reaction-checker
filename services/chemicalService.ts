
import { Chemical, SafetyLevel, ReactionResult } from '../types';
import { COMMON_CHEMICALS, REACTION_RULES } from '../constants';

/**
 * Normalize input ONLY if possible.
 * If not found, we DO NOT fail — AI will handle it.
 */
export function normalizeInput(input: string): Chemical | null {
  const sanitized = input.trim().toLowerCase();
  if (!sanitized) return null;

  return (
    COMMON_CHEMICALS.find(c =>
      c.name.toLowerCase() === sanitized ||
      c.formula.toLowerCase() === sanitized ||
      c.aliases.some(a => a.toLowerCase() === sanitized)
    ) || null
  );
}

/**
 * Main reaction check.
 * Accepts RAW user inputs.
 */
export async function checkReaction(
  input1: string,
  input2: string
): Promise<ReactionResult> {

  const c1 = normalizeInput(input1);
  const c2 = normalizeInput(input2);

  // --------------------------------------------------
  // 1️⃣ SAME CHEMICAL (only if both recognized)
  // --------------------------------------------------
  if (c1 && c2 && c1.id === c2.id) {
    return {
      type: SafetyLevel.SAFE,
      title: 'Same Substance',
      explanation: `You are mixing ${c1.name} with itself. No chemical reaction will occur.`,
      recommendations: ['Mixing identical substances is safe.'],
      chemicals: [input1, input2],
      timestamp: Date.now()
    };
  }

  // --------------------------------------------------
  // 2️⃣ RULE-BASED FAST PATH (only if both recognized)
  // --------------------------------------------------
  if (c1 && c2) {
    const rule = REACTION_RULES.find(r =>
      (r.chemicals[0] === c1.id && r.chemicals[1] === c2.id) ||
      (r.chemicals[0] === c2.id && r.chemicals[1] === c1.id)
    );

    if (rule) {
      return {
        ...rule.result,
        chemicals: [input1, input2],
        timestamp: Date.now()
      };
    }
  }

  // --------------------------------------------------
  // 3️⃣ AI FALLBACK (ALWAYS AVAILABLE)
  // --------------------------------------------------
  try {
    // Backend expects 'chem1' and 'chem2' keys
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chem1: input1,
        chem2: input2
      })
    });

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.statusText}`);
    }

    const wrapper = await response.json();
    if (wrapper.error) throw new Error(wrapper.error);

    let data;
    try {
      // Try to parse the result as JSON first (if backend returns JSON string)
      data = JSON.parse(wrapper.result);
    } catch (e) {
      // Fallback: Parse Markdown text from backend
      // console.log("Parsing text response:", wrapper.result);
      data = parseMarkdownResponse(wrapper.result);
    }

    // Ensure we have valid Chemical Safety Level
    let safeType = data.type as SafetyLevel;
    if (!Object.values(SafetyLevel).includes(safeType)) {
      // specific fix for commonly returned "Generally Safe" not matching enum
      if (data.type && data.type.toLowerCase().includes('safe')) safeType = SafetyLevel.SAFE;
      else safeType = SafetyLevel.UNKNOWN;
    }

    return {
      type: safeType,
      title: data.title || "Analysis Result",
      explanation: data.explanation || "No explanation provided.",
      recommendations: data.recommendations || [],
      chemicals: [input1, input2],
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("AI analysis failed:", error);

    // --------------------------------------------------
    // 4️⃣ FINAL SAFETY FALLBACK (never silent)
    // --------------------------------------------------
    return {
      type: SafetyLevel.UNKNOWN,
      title: 'Analysis Failed',
      explanation:
        'The system could not confidently determine the safety of this combination. Please check if the backend is running.',
      recommendations: [
        'Do not mix unknown substances',
        'Assume it may be unsafe',
        'Refer to official safety documentation'
      ],
      chemicals: [input1, input2],
      timestamp: Date.now()
    };
  }
}

function parseMarkdownResponse(text: string): any {
  const lowerText = text.toLowerCase();

  // Determine Safety Level
  let type = SafetyLevel.UNKNOWN;
  if (lowerText.includes('unsafe') || lowerText.includes('danger') || lowerText.includes('toxic') || lowerText.includes('explode')) {
    type = SafetyLevel.DANGEROUS;
  } else if (lowerText.includes('exothermic')) {
    type = SafetyLevel.EXOTHERMIC;
  } else if (lowerText.includes('mild')) {
    type = SafetyLevel.MILD;
  } else if (lowerText.includes('safe')) {
    type = SafetyLevel.SAFE;
  }

  // Extract Title from "**Category: ...**"
  const categoryMatch = text.match(/\*\*Category:\s*(.*?)\*\*/i);
  const title = categoryMatch ? categoryMatch[1].trim() : "Chemical Analysis";

  // Extract Explanation
  // Remove "Category" line
  let explanation = text.replace(/\*\*Category:.*?\*\*/i, '').trim();
  // Truncate at "Precautions" or "Safety" header
  const splitRegex = /\*\*Precautions:?\*\*|\*\*Safety Considerations:?\*\*|\*\*Safety Precautions:?\*\*/i;
  const parts = explanation.split(splitRegex);
  if (parts.length > 1) {
    explanation = parts[0].trim();
  }

  // Extract Recommendations
  const recommendations: string[] = [];
  // Find the section starting with Precautions/Safety
  const precMatch = text.match(splitRegex);
  if (precMatch) {
    const index = precMatch.index;
    if (index !== undefined) {
      const rest = text.substring(index);
      const lines = rest.split('\n');
      lines.forEach(line => {
        // Match bullet points like "1. ", "- ", "* "
        const clean = line.replace(/^(\d+\.|-|\*)\s*/, '').trim();
        // Filter out the header itself and empty lines
        if (clean && !clean.toLowerCase().includes('precautions') && !clean.toLowerCase().includes('safety considerations')) {
          recommendations.push(clean);
        }
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Proceed with caution.");
  }

  return {
    type,
    title,
    explanation,
    recommendations: recommendations.slice(0, 5)
  };
}
