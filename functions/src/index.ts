import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";

const geminiKey = defineString("GEMINI_API_KEY");

/**
 * Cloud Function: scheduled orchestration for proactive risk checks.
 * Deploy with: firebase deploy --only functions
 */
export const scheduledRiskCheck = onRequest(async (req, res) => {
  res.json({
    status: "ok",
    message: "Hourglass scheduled risk check — connect Firestore trigger in production",
    geminiConfigured: Boolean(geminiKey.value()),
  });
});
