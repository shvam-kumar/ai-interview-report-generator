const { GoogleGenAI, Type } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

// Gemini's responseSchema expects its own Schema format (uppercase Type enum values,
// OpenAPI-style structure) rather than standard JSON Schema. zodToJsonSchema() produces
// standard JSON Schema, and Gemini appears to only partially honor it — especially for
// nested arrays of objects, which it was silently flattening into arrays of plain strings.
// Building the schema natively here removes that translation mismatch entirely.
const interviewReportGeminiSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The title of the job for which the interview report is generated" },
        matchScore: { type: Type.NUMBER, description: "A score between 0 and 100 indicating how well the candidate's profile matches the job description" },
        technicalQuestions: {
            type: Type.ARRAY,
            description: "Technical questions that can be asked in the interview along with their intention and how to answer them",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The technical question that can be asked in the interview" },
                    intention: { type: Type.STRING, description: "The intention of the interviewer behind asking this question" },
                    answer: { type: Type.STRING, description: "How to answer this question, what points to cover, what approach to take etc." }
                },
                required: [ "question", "intention", "answer" ]
            }
        },
        behavioralQuestions: {
            type: Type.ARRAY,
            description: "Behavioral questions that can be asked in the interview along with their intention and how to answer them",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The behavioral question that can be asked in the interview" },
                    intention: { type: Type.STRING, description: "The intention of the interviewer behind asking this question" },
                    answer: { type: Type.STRING, description: "How to answer this question, what points to cover, what approach to take etc." }
                },
                required: [ "question", "intention", "answer" ]
            }
        },
        skillGaps: {
            type: Type.ARRAY,
            description: "List of skill gaps in the candidate's profile along with their severity",
            items: {
                type: Type.OBJECT,
                properties: {
                    skill: { type: Type.STRING, description: "The skill which the candidate is lacking" },
                    severity: { type: Type.STRING, enum: [ "low", "medium", "high" ], description: "The severity of this skill gap" }
                },
                required: [ "skill", "severity" ]
            }
        },
        preparationPlan: {
            type: Type.ARRAY,
            description: "A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively",
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.NUMBER, description: "The day number in the preparation plan, starting from 1" },
                    focus: { type: Type.STRING, description: "The main focus of this day in the preparation plan" },
                    tasks: {
                        type: Type.ARRAY,
                        description: "List of tasks to be done on this day to follow the preparation plan",
                        items: { type: Type.STRING }
                    }
                },
                required: [ "day", "focus", "tasks" ]
            }
        }
    },
    required: [ "title", "matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan" ]
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate a detailed interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        For technicalQuestions and behavioralQuestions, each entry must be a full object containing a question, the interviewer's intention behind asking it, and detailed guidance on how to answer it — never a plain question string on its own.
                        For skillGaps, each entry must be a full object naming the skill and rating its severity as low, medium, or high — never a plain string on its own.
                        For preparationPlan, each entry must be a full object with a day number, a focus area, and a list of concrete tasks — never a plain string on its own.
                        Provide at least 3-5 entries for technicalQuestions, behavioralQuestions, and preparationPlan, and as many skillGaps as are genuinely relevant.
`

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: interviewReportGeminiSchema,
            maxOutputTokens: 8192,
        }
    })

    console.log("RAW AI RESPONSE:", response.text)

    let parsed
    try {
        parsed = JSON.parse(response.text)
    } catch (err) {
        console.error("Failed to parse AI response for interview report:", response.text)
        throw new Error("AI returned invalid JSON for interview report")
    }

    // Final safety net: validate against the original Zod schema so any lingering
    // shape mismatch throws a clear error here instead of surfacing as a confusing
    // Mongoose ValidationError later.
    const validation = interviewReportSchema.safeParse(parsed)
    if (!validation.success) {
        console.error("AI response did not match expected schema:", validation.error.format())
        throw new Error("AI response did not match the expected interview report structure")
    }

    return validation.data
}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.

                        Respond ONLY with a JSON object matching the schema exactly, using the field name "html".
                    `

    const resumePdfGeminiSchema = {
        type: Type.OBJECT,
        properties: {
            html: { type: Type.STRING, description: "The HTML content of the resume which can be converted to PDF" }
        },
        required: [ "html" ]
    }

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: resumePdfGeminiSchema,
        }
    })

    let jsonContent
    try {
        jsonContent = JSON.parse(response.text)
    } catch (err) {
        console.error("Failed to parse AI response for resume PDF:", response.text)
        throw new Error("AI returned invalid JSON for resume PDF")
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }