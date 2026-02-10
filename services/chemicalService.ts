
import { Chemical, SafetyLevel, ReactionResult } from '../types';
import { COMMON_CHEMICALS, REACTION_RULES } from '../constants';

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


export async function checkReaction(
  input1: string,
  input2: string
): Promise<ReactionResult> {

  const c1 = normalizeInput(input1);
  const c2 = normalizeInput(input2);


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


  try {
  const response = await fetch(
    "https://chemical-reaction-checker-backend.onrender.com/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chem1: input1,
        chem2: input2
      })
    }
  );


    if (!response.ok) {
      throw new Error(`Backend Error: ${response.statusText}`);
    }

    const wrapper = await response.json();
    if (wrapper.error) throw new Error(wrapper.error);
    let data;

if (typeof wrapper.result === "string") {
  try {
    data = JSON.parse(wrapper.result);
  } catch {
    data = parseMarkdownResponse(wrapper.result);
  }
} else {
  data = wrapper.result;
}


    let safeType = data.type as SafetyLevel;
    if (!Object.values(SafetyLevel).includes(safeType)) {

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

  const categoryMatch = text.match(/\*\*Category:\s*(.*?)\*\*/i);
  const title = categoryMatch ? categoryMatch[1].trim() : "Chemical Analysis";

  let explanation = text.replace(/\*\*Category:.*?\*\*/i, '').trim();

  const splitRegex = /\*\*Precautions:?\*\*|\*\*Safety Considerations:?\*\*|\*\*Safety Precautions:?\*\*/i;
  const parts = explanation.split(splitRegex);
  if (parts.length > 1) {
    explanation = parts[0].trim();
  }

 
  const recommendations: string[] = [];
 
  const precMatch = text.match(splitRegex);
  if (precMatch) {
    const index = precMatch.index;
    if (index !== undefined) {
      const rest = text.substring(index);
      const lines = rest.split('\n');
      lines.forEach(line => {
 
        const clean = line.replace(/^(\d+\.|-|\*)\s*/, '').trim();
    
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
