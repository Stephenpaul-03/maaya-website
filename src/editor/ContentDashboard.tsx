import { ArrowUpRight, BookOpen, LayoutTemplate, NotebookPen, Ticket } from 'lucide-react'

export function ContentDashboard({ disabled, onHomepage, onCoupons, onJournal, onReadingList }: {
  disabled: boolean
  onHomepage: () => void; onCoupons: () => void; onJournal: () => void; onReadingList: () => void
}) {
  const actions = [
    { title: 'Homepage', note: 'Choose what visitors discover first.', detail: 'Hero books, featured books, reading lists & journal', icon: LayoutTemplate, action: onHomepage, tone: 'sage' },
    { title: 'Coupons', note: 'Make a little room for something extra.', detail: 'Add, edit, pause, reorder or remove offers', icon: Ticket, action: onCoupons, tone: 'butter' },
    { title: 'New journal', note: 'Give your next story a home.', detail: 'Write an article with a live page preview', icon: NotebookPen, action: onJournal, tone: 'clay' },
    { title: 'New reading list', note: 'Bring a collection of books together.', detail: 'Choose books, arrange their order & preview', icon: BookOpen, action: onReadingList, tone: 'sage' },
  ]
  return <main className="content-dashboard" aria-labelledby="content-dashboard-title">
    <div className="content-dashboard-inner">
      <div className="content-dashboard-intro"><span>YOUR BOOKSHOP · CONTENT STUDIO</span><h1 id="content-dashboard-title">What would you like<br />to curate today?</h1><p>Choose a workspace below. Save your changes locally, then publish when you’re ready.</p></div>
      <div className="content-dashboard-grid">{actions.map(({ title, note, detail, icon: Icon, action, tone }, index) => <button key={title} className={`content-dashboard-card tone-${tone}`} disabled={disabled} onClick={action} aria-label={title}>
        <span className="content-card-top"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /><span>0{index + 1}</span></span><strong>{title}</strong><span className="content-card-note">{note}</span><span className="content-card-detail">{detail}<ArrowUpRight size={20} aria-hidden="true" /></span>
      </button>)}</div>
      <div className="content-dashboard-footnote"><span>Nothing goes live until you publish.</span><a href="/" target="_blank" rel="noopener noreferrer">View storefront <ArrowUpRight size={15} aria-hidden="true" /></a></div>
    </div>
  </main>
}
