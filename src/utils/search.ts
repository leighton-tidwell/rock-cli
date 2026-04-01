export interface SearchQuery {
	where?: string;
	select?: string;
	sort?: string;
	offset?: number;
	take?: number;
}

export interface SearchResult<T> {
	count: number;
	items: T[];
}
