/**
 * Search controller
 * Handles search suggestions for typeahead
 */

import { Request, Response, NextFunction } from "express";
import { getSearchSuggestions } from "../services/doctor.service";

/**
 * GET /api/v1/search/suggestions?q=<text>
 * Returns departments and doctors matching the query (min 2 chars)
 */
export async function getSuggestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = (req.query.q as string) ?? "";
    const result = await getSearchSuggestions(q);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
