export default function SearchAndFilters({
  search,
  onSearch,
  agentFilter,
  onAgentFilter,
  ciFilter,
  onCiFilter,
}) {
  return (
    <div className="filters">
      <label className="search-field">
        <span className="sr-only">Search pull requests</span>
        <span aria-hidden="true">⌕</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search title or author"
        />
      </label>
      <label>
        <span className="sr-only">Filter by author type</span>
        <select value={agentFilter} onChange={(event) => onAgentFilter(event.target.value)}>
          <option value="all">All authors</option>
          <option value="agent">Agent generated</option>
          <option value="human">Human authored</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Filter by checks</span>
        <select value={ciFilter} onChange={(event) => onCiFilter(event.target.value)}>
          <option value="all">All checks</option>
          <option value="PASSED">Checks passed</option>
          <option value="FAILED">Checks failed</option>
          <option value="RUNNING">Checks running</option>
          <option value="NOT_AVAILABLE">No checks</option>
        </select>
      </label>
    </div>
  );
}
