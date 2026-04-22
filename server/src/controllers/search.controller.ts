import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Document from '../models/Document';
import SavedSearch from '../models/SavedSearch';
import { ISearchFilters } from '../../../shared/types';
import { generateCSV } from '../utils/export.util';

// Helper to build MongoDB query from filters
const buildSearchQuery = (filters: ISearchFilters) => {
    const query: any = { caseId: filters.caseId };

    // Map of filter keys to query fields for array/in logic
    const arrayMappings: Array<[keyof ISearchFilters, string]> = [
        ['custodianIds', 'custodianId'],
        ['privilegeStatuses', 'coding.privilegeStatus'],
        ['relevanceStatuses', 'coding.relevanceStatus'],
        ['issueTagIds', 'tags']
    ];

    arrayMappings.forEach(([filterKey, queryField]) => {
        const val = filters[filterKey];
        if (Array.isArray(val) && val.length > 0) {
            query[queryField] = { $in: val };
        }
    });

    if (filters.hasNotes) {
        query['coding.reviewNotes'] = { $exists: true, $ne: '' };
    }

    if (filters.filenameQuery) {
        query.filename = { $regex: filters.filenameQuery, $options: 'i' };
    }

    // "isDuplicate" filter logic:
    // If filter.isDuplicate is false (default), we want to EXCLUDE duplicates (show only originals).
    // If filter.isDuplicate is true, we want to INCLUDE duplicates (show everything).
    // So if false (or undefined), query.isDuplicate = false.
    // If true, we don't set query.isDuplicate at all.
    if (!filters.isDuplicate) {
        query.isDuplicate = false;
    }

    if (filters.dateRange) {
        processDateRange(query, filters.dateRange);
    }

    return query;
};

const processDateRange = (query: any, dateRange: { from?: string; to?: string }) => {
    const dateQuery: any = {};
    if (dateRange.from) {
        dateQuery.$gte = new Date(dateRange.from);
    }
    if (dateRange.to) {
        dateQuery.$lte = new Date(dateRange.to);
    }
    if (Object.keys(dateQuery).length > 0) {
        query.documentDate = dateQuery;
    }
};

// @desc    Advanced Search
// @route   POST /api/documents/search
// @access  Private
export const advancedSearch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filters: ISearchFilters = req.body;
        const { page = 1, limit = 50, sort = 'dateDesc' } = req.query;

        if (!filters.caseId) {
            res.status(400).json({ message: 'Case ID is required' });
            return;
        }

        const query = buildSearchQuery(filters);

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        let sortOptions: any = {};
        if (sort === 'dateAsc') sortOptions.documentDate = 1;
        else if (sort === 'dateDesc') sortOptions.documentDate = -1;
        else sortOptions.createdAt = -1;

        const documents = await Document.find(query)
            .populate('custodianId', 'name')
            .populate('tags', 'tagName color')
            .populate('uploadedBy', 'firstName lastName')
            .populate('coding.reviewedBy', 'firstName lastName')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        const docsCount = await Document.countDocuments(query);

        res.json({
            documents,
            page: pageNum,
            pages: Math.ceil(docsCount / limitNum), // Use docsCount here
            total: docsCount // Use docsCount here
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save Search
// @route   POST /api/cases/:caseId/saved-searches
// @access  Private
export const saveSearch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const { searchName, filters } = req.body;

        if (!searchName || !filters) {
            res.status(400).json({ message: 'Search name and filters are required' });
            return;
        }

        // Create saved search
        const savedSearch = await SavedSearch.create({
            caseId,
            userId: req.user!._id,
            searchName,
            filters
        });

        res.status(201).json(savedSearch);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Saved Searches
// @route   GET /api/cases/:caseId/saved-searches
// @access  Private
export const getSavedSearches = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;

        const searches = await SavedSearch.find({
            caseId,
            userId: req.user!._id
        }).sort({ createdAt: -1 });

        res.json(searches);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Saved Search
// @route   DELETE /api/saved-searches/:id
// @access  Private
export const deleteSavedSearch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const search = await SavedSearch.findById(req.params.id);

        if (!search) {
            res.status(404).json({ message: 'Saved search not found' });
            return;
        }

        if (search.userId.toString() !== req.user!._id.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this search' });
            return;
        }

        await search.deleteOne();
        res.json({ message: 'Saved search deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export Search Results
// @route   POST /api/documents/export
// @access  Private
export const exportDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filters: ISearchFilters = req.body;

        if (!filters.caseId) {
            res.status(400).json({ message: 'Case ID is required' });
            return;
        }

        const query = buildSearchQuery(filters);

        // Fetch all matching documents (caution with large datasets)
        const documents = await Document.find(query)
            .populate('custodianId', 'name')
            .populate('tags', 'tagName')
            .sort({ documentDate: -1 })
            .limit(5000);

        const csvData = generateCSV(documents);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`search_export_${timestamp}.csv`);
        res.send(csvData);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
