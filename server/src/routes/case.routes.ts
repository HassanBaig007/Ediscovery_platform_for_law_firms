import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
    createCase,
    getCases,
    getCaseById,
    updateCase,
    deleteCase,
    addTeamMember,
    removeTeamMember,
    getAvailableUsers,
    getCaseActivity
} from '../controllers/case.controller';
import { saveSearch, getSavedSearches } from '../controllers/search.controller';

const router = express.Router();

router.route('/')
    .post(protect, createCase) // Partner/Admin checked in controller or we can add middleware if strict
    .get(protect, getCases);

router.route('/:id')
    .get(protect, getCaseById)
    .put(protect, updateCase) // Lead/Admin checked in controller
    .delete(protect, adminOnly, deleteCase);

router.route('/:id/activity')
    .get(protect, getCaseActivity);

router.route('/:id/team')
    .post(protect, addTeamMember);

router.route('/:id/team/:userId')
    .delete(protect, removeTeamMember);

router.route('/:id/available-users')
    .get(protect, getAvailableUsers);

router.route('/:caseId/saved-searches')
    .post(protect, saveSearch)
    .get(protect, getSavedSearches);

export default router;
