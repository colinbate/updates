<!-- The only HTML inserted in this component is the fixed, source-controlled SVG icon set below. -->
<!-- eslint-disable svelte/no-at-html-tags -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type View = 'today' | 'highlights' | 'saved' | 'feeds' | 'streams' | 'system';
	type Editor = 'feed' | 'stream' | null;
	type Score = { streamId: string; relevance: number; reason: string; highlighted: boolean };
	type Summary = {
		whatHappened: string;
		whyItMatters: string | null;
		keyDetails: string[];
		worthReadingReason: string | null;
	};
	type Article = PageData['articles'][number] & { scores: Score[]; summary: Summary | null };

	let activeView = $state<View>('today');
	let activeStream = $state<string | null>(null);
	let editor = $state<Editor>(null);
	let editingId = $state<string | null>(null);
	let busy = $state<string | null>(null);
	let notice = $state<string | null>(null);

	const streamMap = $derived(new Map(data.streams.map((stream) => [stream.id, stream])));
	const articles = $derived(data.articles.map(parseArticle));
	const visibleArticles = $derived.by(() => {
		if (activeView === 'saved') return articles.filter((article) => Boolean(article.saved));
		if (activeView === 'highlights')
			return articles.filter(
				(article) => !article.dismissed && article.scores.some((score) => score.highlighted)
			);
		if (activeView === 'today' && activeStream) {
			const stream = streamMap.get(activeStream);
			return articles.filter(
				(article) =>
					!article.dismissed &&
					article.scores.some(
						(score) =>
							score.streamId === activeStream &&
							score.relevance >= (stream?.relevance_threshold ?? 0.6)
					)
			);
		}
		return articles.filter(
			(article) =>
				!article.dismissed &&
				article.scores.some(
					(score) => score.relevance >= (streamMap.get(score.streamId)?.relevance_threshold ?? 0.6)
				)
		);
	});
	const highlighted = $derived(
		visibleArticles.filter((article) => article.scores.some((score) => score.highlighted))
	);
	const recent = $derived(visibleArticles.filter((article) => !highlighted.includes(article)));
	const currentFeed = $derived(data.feeds.find((feed) => feed.id === editingId) ?? null);
	const currentStream = $derived(data.streams.find((stream) => stream.id === editingId) ?? null);

	function parseArticle(article: PageData['articles'][number]): Article {
		const rawScores = typeof article.stream_scores === 'string' ? article.stream_scores : '';
		let summary: Summary | null = null;
		if (typeof article.summary_json === 'string') {
			try {
				summary = JSON.parse(article.summary_json) as Summary;
			} catch {
				summary = null;
			}
		}
		return {
			...article,
			summary,
			scores: rawScores
				.split('|||')
				.filter(Boolean)
				.map((raw) => {
					const [streamId, relevance, reason, isHighlighted] = raw.split('::');
					return {
						streamId,
						relevance: Number(relevance),
						reason,
						highlighted: isHighlighted === '1'
					};
				})
		};
	}

	function relativeDate(value: unknown) {
		if (typeof value !== 'string') return 'Recently';
		const date = new Date(value);
		const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
		if (days <= 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function icon(name: string) {
		const paths: Record<string, string> = {
			today: '<path d="M4 5h16v15H4z"/><path d="M8 3v4M16 3v4M4 9h16"/>',
			highlights:
				'<path d="m12 3 2.2 5.4L20 10l-5 3.2.3 5.8-3.3-2.3L8.7 19 9 13.2 4 10l5.8-1.6z"/>',
			saved: '<path d="M6 3h12v18l-6-4-6 4z"/>',
			feeds: '<circle cx="6" cy="18" r="1"/><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/>',
			streams: '<path d="M4 7h16M4 12h16M4 17h10"/>',
			system:
				'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
			plus: '<path d="M12 5v14M5 12h14"/>',
			check: '<path d="m5 12 4 4L19 6"/>',
			x: '<path d="m6 6 12 12M18 6 6 18"/>',
			external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/>',
			refresh:
				'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.6-2L20 12M4 12l2.3 5a7 7 0 0 0 11.6-2"/>',
			edit: '<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 7 17 10.5"/>',
			trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
			menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
			arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>'
		};
		return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? ''}</svg>`;
	}

	function navigate(view: View, streamId: string | null = null) {
		activeView = view;
		activeStream = streamId;
		editor = null;
		editingId = null;
	}
	async function post(action: string, formData: FormData, busyKey = action) {
		busy = busyKey;
		notice = null;
		try {
			const response = await fetch(`?/${action}`, { method: 'POST', body: formData });
			const result = (await response.json()) as { type?: string; data?: { error?: string } };
			if (!response.ok || result.type === 'failure')
				throw new Error(result.data?.error ?? 'The request could not be completed');
			await invalidateAll();
			notice = action === 'pollFeed' ? 'Feed poll finished.' : 'Saved.';
			if (action === 'saveFeed' || action === 'saveStream') {
				editor = null;
				editingId = null;
			}
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Something went wrong';
		} finally {
			busy = null;
		}
	}
	function articleAction(articleId: unknown, operation: string) {
		const form = new FormData();
		form.set('articleId', String(articleId));
		form.set('operation', operation);
		return post('article', form, `${operation}:${articleId}`);
	}
	function submitForm(event: SubmitEvent, action: string) {
		event.preventDefault();
		return post(action, new FormData(event.currentTarget as HTMLFormElement));
	}
	function bulkDismiss() {
		const form = new FormData();
		for (const article of visibleArticles) form.append('articleId', String(article.id));
		return post('bulkDismiss', form);
	}
	function feedHasStream(feedId: string, streamId: string) {
		return data.feedStreams.some(
			(association) => association.feed_id === feedId && association.stream_id === streamId
		);
	}
	function openEditor(type: Exclude<Editor, null>, id: string | null = null) {
		editor = type;
		editingId = id;
	}
</script>

<svelte:head
	><title
		>{activeView === 'today'
			? 'Updates'
			: `${activeView[0].toUpperCase()}${activeView.slice(1)} · Updates`}</title
	></svelte:head
>

<div class="app-shell">
	<aside class="sidebar">
		<button class="brand" onclick={() => navigate('today')} aria-label="Updates home"
			><span class="brand-mark"><span></span><span></span><span></span></span><span>Updates</span
			></button
		>
		<nav class="main-nav" aria-label="Primary navigation">
			<button
				class:active={activeView === 'today' && !activeStream}
				onclick={() => navigate('today')}>{@html icon('today')}<span>Today</span></button
			>
			<button class:active={activeView === 'highlights'} onclick={() => navigate('highlights')}
				>{@html icon('highlights')}<span>Highlights</span></button
			>
			<button class:active={activeView === 'saved'} onclick={() => navigate('saved')}
				>{@html icon('saved')}<span>Saved</span></button
			>
		</nav>
		<div class="nav-section">
			<div class="nav-label">
				<span>Streams</span><button onclick={() => openEditor('stream')} aria-label="Add stream"
					>{@html icon('plus')}</button
				>
			</div>
			{#each data.streams.filter((stream) => stream.enabled) as stream (stream.id)}
				<button
					class="stream-link"
					class:active={activeStream === stream.id}
					onclick={() => navigate('today', stream.id)}
					><span
						class="stream-dot"
						style:--stream-color={stream.id === 'work' ? '#d96c3b' : '#7f8f67'}
					></span><span>{stream.name}</span></button
				>
			{/each}
		</div>
		<div class="sidebar-spacer"></div>
		<nav class="utility-nav" aria-label="Management">
			<button class:active={activeView === 'feeds'} onclick={() => navigate('feeds')}
				>{@html icon('feeds')}<span>Feeds</span>{#if data.stats.unhealthyFeeds}<span
						class="health-dot"
						title="Some feeds need attention"
					></span>{/if}</button
			>
			<button class:active={activeView === 'streams'} onclick={() => navigate('streams')}
				>{@html icon('streams')}<span>Manage streams</span></button
			>
			<button class:active={activeView === 'system'} onclick={() => navigate('system')}
				>{@html icon('system')}<span>Diagnostics</span></button
			>
		</nav>
		<div class="profile">
			<span class="avatar">CB</span><span
				><strong>Personal reader</strong><small>Private workspace</small></span
			>
		</div>
	</aside>

	<main>
		{#if !data.configured}
			<section class="setup-state">
				<div class="setup-icon">{@html icon('feeds')}</div>
				<h1>Connect the database to begin</h1>
				<p>
					Updates is built and ready. Add the D1 database ID, apply the migration, and set the cron
					secret to start collecting articles.
				</p>
				<code>pnpm db:migrate:local</code>
			</section>
		{:else if activeView === 'feeds'}
			<header class="page-header management-header">
				<div>
					<p class="kicker">Sources</p>
					<h1>Feeds</h1>
					<p>Control what comes in and how much content each source provides.</p>
				</div>
				<button class="primary-button" onclick={() => openEditor('feed')}
					>{@html icon('plus')} Add feed</button
				>
			</header>
			<section class="management-list">
				{#each data.feeds as feed (feed.id)}
					<article class="management-card">
						<div class="source-glyph">{feed.title.slice(0, 1).toUpperCase()}</div>
						<div class="management-main">
							<div class="management-title">
								<h2>{feed.title}</h2>
								<span class:ok={!feed.last_error} class:error={!!feed.last_error}
									>{feed.last_error ? 'Needs attention' : feed.enabled ? 'Active' : 'Paused'}</span
								>
							</div>
							<p>{feed.url}</p>
							<div class="meta-row">
								<span>{feed.content_mode.replaceAll('_', ' ')}</span><span
									>Last checked {feed.last_polled_at
										? relativeDate(feed.last_polled_at)
										: 'never'}</span
								>{#if feed.last_error}<span class="error-copy">{feed.last_error}</span>{/if}
							</div>
						</div>
						<div class="card-actions">
							<button
								title="Poll now"
								disabled={busy === `poll:${feed.id}`}
								onclick={() => {
									const form = new FormData();
									form.set('id', feed.id);
									post('pollFeed', form, `poll:${feed.id}`);
								}}>{@html icon('refresh')}</button
							><button title="Edit" onclick={() => openEditor('feed', feed.id)}
								>{@html icon('edit')}</button
							><button
								class="danger"
								title="Delete"
								onclick={() => {
									const form = new FormData();
									form.set('id', feed.id);
									post('deleteFeed', form, `delete:${feed.id}`);
								}}>{@html icon('trash')}</button
							>
						</div>
					</article>
				{:else}<div class="empty-state">
						<p>No feeds yet.</p>
						<button onclick={() => openEditor('feed')}>Add your first feed</button>
					</div>{/each}
			</section>
		{:else if activeView === 'streams'}
			<header class="page-header management-header">
				<div>
					<p class="kicker">Intelligence</p>
					<h1>Streams</h1>
					<p>Describe what matters. The classifier uses this guidance for every article.</p>
				</div>
				<button class="primary-button" onclick={() => openEditor('stream')}
					>{@html icon('plus')} New stream</button
				>
			</header>
			<section class="stream-grid">
				{#each data.streams as stream (stream.id)}
					<article class="stream-card">
						<div class="stream-card-top">
							<span class="stream-monogram">{stream.name.slice(0, 2).toUpperCase()}</span><span
								class:ok={stream.enabled}>{stream.enabled ? 'Enabled' : 'Paused'}</span
							>
						</div>
						<h2>{stream.name}</h2>
						<p>{stream.description || 'No description yet.'}</p>
						<div class="thresholds">
							<span>Relevant <strong>{Math.round(stream.relevance_threshold * 100)}%</strong></span
							><span
								>Highlight <strong>{Math.round(stream.highlight_threshold * 100)}%</strong></span
							>
						</div>
						<div class="stream-card-actions">
							<button onclick={() => openEditor('stream', stream.id)}
								>{@html icon('edit')} Edit guidance</button
							><button
								class="icon-only danger"
								aria-label="Delete stream"
								onclick={() => {
									const form = new FormData();
									form.set('id', stream.id);
									post('deleteStream', form, `delete:${stream.id}`);
								}}>{@html icon('trash')}</button
							>
						</div>
					</article>
				{/each}
			</section>
		{:else if activeView === 'system'}
			<header class="page-header">
				<p class="kicker">Operations</p>
				<h1>Diagnostics</h1>
				<p>A quiet pulse on ingestion, analysis, and resource use.</p>
			</header>
			<section class="stats-grid">
				<div><span>Retained articles</span><strong>{data.stats.articles}</strong></div>
				<div><span>Saved indefinitely</span><strong>{data.stats.saved}</strong></div>
				<div><span>Highlight candidates</span><strong>{data.stats.highlights}</strong></div>
				<div>
					<span>Feed health</span><strong
						>{data.stats.feeds - data.stats.unhealthyFeeds}/{data.stats.feeds}</strong
					>
				</div>
			</section>
			<section class="metrics-panel">
				<div class="section-heading">
					<div>
						<h2>Recent activity</h2>
						<p>Daily counters from the last two weeks</p>
					</div>
				</div>
				{#if data.metrics.length}<div class="metrics-table">
						{#each data.metrics as metric (`${metric.day}:${metric.metric}`)}<div>
								<time>{metric.day}</time><span>{metric.metric.replaceAll('_', ' ')}</span><strong
									>{metric.value.toLocaleString()}</strong
								>
							</div>{/each}
					</div>{:else}<div class="empty-inline">
						Metrics will appear after the first poll.
					</div>{/if}
			</section>
		{:else}
			<header class="page-header reading-header">
				<div>
					<p class="kicker">
						{activeStream
							? streamMap.get(activeStream)?.name
							: activeView === 'highlights'
								? 'Highlights'
								: activeView === 'saved'
									? 'Library'
									: 'Your briefing'}
					</p>
					<h1>
						{activeView === 'saved'
							? 'Saved for later'
							: activeView === 'highlights'
								? 'Worth your attention'
								: activeStream
									? streamMap.get(activeStream)?.name
									: 'Good morning'}
					</h1>
					<p>
						{activeView === 'saved'
							? 'The articles you chose to keep, without an expiry date.'
							: visibleArticles.length
								? `${visibleArticles.length} useful ${visibleArticles.length === 1 ? 'update' : 'updates'} rose above the noise.`
								: 'Nothing needs your attention right now. That is a good thing.'}
					</p>
				</div>
				{#if visibleArticles.length}<button class="quiet-button" onclick={bulkDismiss}
						>{@html icon('check')} Caught up enough</button
					>{/if}
			</header>
			{#if activeView === 'today' && !activeStream && data.streams.length}<div class="stream-pills">
					<button class:active={!activeStream} onclick={() => navigate('today')}>Everything</button
					>{#each data.streams.filter((stream) => stream.enabled) as stream (stream.id)}<button
							class:active={activeStream === stream.id}
							onclick={() => navigate('today', stream.id)}>{stream.name}</button
						>{/each}
				</div>{/if}
			{#if highlighted.length && activeView !== 'saved'}<section class="article-section">
					<div class="section-heading">
						<div>
							<h2>Worth your attention</h2>
							<p>High-signal developments selected for you</p>
						</div>
						<span>{highlighted.length}</span>
					</div>
					<div class="article-list">
						{#each highlighted as article (String(article.id))}{@render articleCard(
								article,
								true
							)}{/each}
					</div>
				</section>{/if}
			<section class="article-section">
				<div class="section-heading">
					<div>
						<h2>
							{activeView === 'saved'
								? 'Your library'
								: highlighted.length
									? 'Also relevant'
									: 'Recent'}
						</h2>
						<p>
							{activeView === 'saved'
								? 'Kept until you decide otherwise'
								: 'Useful updates, ordered by recency'}
						</p>
					</div>
					{#if recent.length}<span>{recent.length}</span>{/if}
				</div>
				{#if recent.length}<div class="article-list">
						{#each recent as article (String(article.id))}{@render articleCard(
								article,
								false
							)}{/each}
					</div>{:else if !highlighted.length}<div class="empty-state reader-empty">
						<span class="empty-orbit"></span>
						<h3>All quiet here</h3>
						<p>Add a feed or adjust your stream guidance, then let Updates do the sorting.</p>
						{#if !data.feeds.length}<button onclick={() => navigate('feeds')}
								>Add a feed {@html icon('arrow')}</button
							>{/if}
					</div>{/if}
			</section>
		{/if}
	</main>

	{#if editor}
		<div
			class="editor-scrim"
			role="presentation"
			onclick={(event) => event.currentTarget === event.target && (editor = null)}
		>
			<div
				class="editor-panel"
				role="dialog"
				aria-modal="true"
				aria-label={editor === 'feed' ? 'Feed editor' : 'Stream editor'}
			>
				<header>
					<div>
						<p class="kicker">{editingId ? 'Edit' : 'Create'}</p>
						<h2>{editor === 'feed' ? 'Feed source' : 'Intelligence stream'}</h2>
					</div>
					<button onclick={() => (editor = null)} aria-label="Close">{@html icon('x')}</button>
				</header>
				{#if editor === 'feed'}
					<form onsubmit={(event) => submitForm(event, 'saveFeed')}>
						<input type="hidden" name="id" value={currentFeed?.id ?? ''} /><label
							>Display name<input
								name="title"
								required
								value={currentFeed?.title ?? ''}
								placeholder="Svelte blog"
							/></label
						><label
							>Feed URL<input
								name="url"
								type="url"
								required
								value={currentFeed?.url ?? ''}
								placeholder="https://example.com/feed.xml"
							/></label
						><label
							>Content policy<select
								name="contentMode"
								value={currentFeed?.content_mode ?? 'browser_if_thin'}
								><option value="feed_only">Use feed content only</option><option
									value="browser_if_thin">Use browser when feed is thin</option
								><option value="browser_always">Always retrieve rendered article</option></select
							></label
						><label
							>Thin-content threshold <span
								>{currentFeed?.minimum_useful_content_chars ?? 800} characters</span
							><input
								name="minimumUsefulContentChars"
								type="number"
								min="0"
								step="100"
								value={currentFeed?.minimum_useful_content_chars ?? 800}
							/></label
						>
						<fieldset>
							<legend>Stream priors</legend>{#each data.streams as stream (stream.id)}<label
									class="check-row"
									><input
										type="checkbox"
										name="streamId"
										value={stream.id}
										checked={currentFeed ? feedHasStream(currentFeed.id, stream.id) : false}
									/><span>{stream.name}</span></label
								>{/each}
						</fieldset>
						<label class="toggle-row"
							><input
								type="checkbox"
								name="enabled"
								checked={currentFeed ? Boolean(currentFeed.enabled) : true}
							/><span>Poll this feed</span></label
						>
						<footer>
							<button type="button" class="secondary-button" onclick={() => (editor = null)}
								>Cancel</button
							><button class="primary-button" disabled={busy === 'saveFeed'}
								>{busy === 'saveFeed' ? 'Saving…' : 'Save feed'}</button
							>
						</footer>
					</form>
				{:else}
					<form onsubmit={(event) => submitForm(event, 'saveStream')}>
						<input type="hidden" name="id" value={currentStream?.id ?? ''} /><label
							>Name<input
								name="name"
								required
								value={currentStream?.name ?? ''}
								placeholder="Book club"
							/></label
						><label
							>Description<input
								name="description"
								value={currentStream?.description ?? ''}
								placeholder="Books, authors, and ideas worth discussing"
							/></label
						><label
							>Relevance guidance<textarea
								name="relevanceInstructions"
								required
								rows="7"
								placeholder="Prioritize… Downrank…"
								>{currentStream?.relevance_instructions ?? ''}</textarea
							></label
						><label
							>Summary guidance <span>Optional</span><textarea
								name="summaryInstructions"
								rows="3"
								placeholder="Preserve practical examples and notable claims."
								>{currentStream?.summary_instructions ?? ''}</textarea
							></label
						>
						<div class="field-pair">
							<label
								>Relevant at<input
									name="relevanceThreshold"
									type="number"
									min="0"
									max="1"
									step="0.05"
									value={currentStream?.relevance_threshold ?? 0.6}
								/></label
							><label
								>Highlight at<input
									name="highlightThreshold"
									type="number"
									min="0"
									max="1"
									step="0.05"
									value={currentStream?.highlight_threshold ?? 0.85}
								/></label
							>
						</div>
						<label class="toggle-row"
							><input
								type="checkbox"
								name="enabled"
								checked={currentStream ? Boolean(currentStream.enabled) : true}
							/><span>Enable this stream</span></label
						>
						<footer>
							<button type="button" class="secondary-button" onclick={() => (editor = null)}
								>Cancel</button
							><button class="primary-button" disabled={busy === 'saveStream'}
								>{busy === 'saveStream' ? 'Saving…' : 'Save stream'}</button
							>
						</footer>
					</form>
				{/if}
			</div>
		</div>
	{/if}
	{#if notice}<button class="toast" onclick={() => (notice = null)}
			>{notice}<span>{@html icon('x')}</span></button
		>{/if}
	<nav class="mobile-nav" aria-label="Mobile navigation">
		<button class:active={activeView === 'today'} onclick={() => navigate('today')}
			>{@html icon('today')}<span>Today</span></button
		><button class:active={activeView === 'highlights'} onclick={() => navigate('highlights')}
			>{@html icon('highlights')}<span>Highlights</span></button
		><button class:active={activeView === 'saved'} onclick={() => navigate('saved')}
			>{@html icon('saved')}<span>Saved</span></button
		><button
			class:active={activeView === 'feeds' || activeView === 'streams' || activeView === 'system'}
			onclick={() => navigate('feeds')}>{@html icon('menu')}<span>Manage</span></button
		>
	</nav>
</div>

{#snippet articleCard(article: Article, hero: boolean)}
	<article class:hero class="article-card">
		<div class="article-rail">
			<span class="source-glyph small"
				>{String(article.feed_title ?? 'U')
					.slice(0, 1)
					.toUpperCase()}</span
			><span></span>
		</div>
		<div class="article-body">
			<div class="article-meta">
				<span>{article.feed_title}</span><span>·</span><time
					>{relativeDate(article.published_at ?? article.discovered_at)}</time
				>{#if article.article_type}<span class="type-tag">{article.article_type}</span>{/if}
			</div>
			<h3>{article.title}</h3>
			{#if article.summary}<p class="summary">{article.summary.whatHappened}</p>
				{#if article.summary.whyItMatters}<div class="why">
						<span>Why it matters</span>
						<p>{article.summary.whyItMatters}</p>
					</div>{/if}{:else if article.processing_status === 'failed'}<p class="processing-error">
					Analysis paused. The article is still available.
				</p>{:else}<p class="processing-note">Analysis in progress</p>{/if}
			<div class="reason-row">
				{#each article.scores
					.filter((score) => score.relevance >= 0.6)
					.slice(0, 2) as score (score.streamId)}<span class="reason-pill"
						><i></i>{streamMap.get(score.streamId)?.name ?? score.streamId}<b
							>{Math.round(score.relevance * 100)}%</b
						></span
					>{/each}
			</div>
			<div class="article-actions">
				<a
					href={String(article.canonical_url ?? article.url)}
					target="_blank"
					rel="noreferrer"
					onclick={() => articleAction(article.id, 'read')}
					>Read original {@html icon('external')}</a
				><button
					class:active={Boolean(article.saved)}
					disabled={busy === `save:${article.id}`}
					onclick={() => articleAction(article.id, 'save')}
					>{@html icon('saved')}{article.saved ? 'Saved' : 'Save'}</button
				><button
					disabled={busy === `dismiss:${article.id}`}
					onclick={() => articleAction(article.id, 'dismiss')}>{@html icon('x')}Dismiss</button
				>{#if article.processing_status === 'failed'}<button
						onclick={() => articleAction(article.id, 'retry')}>{@html icon('refresh')}Retry</button
					>{/if}
			</div>
		</div>
	</article>
{/snippet}
