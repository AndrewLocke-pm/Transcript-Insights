export const testCases = [
  {
    id: "T1-clean-stakeholder",
    description: "Clean stakeholder review — clear decisions, named owners, explicit risks",
    transcript: `We have agreed to move the product launch to Q3. Sarah will update the roadmap and pricing page by Friday. John will chase the payments team this week — that's our highest risk, we're blocked on their API. Users have been telling us the onboarding flow is too complex and takes too long to complete.`,
    checks: [
      { name: "Has at least 1 decision", fn: r => r.decisions?.length >= 1 },
      { name: "Decision mentions Q3", fn: r => r.decisions?.some(d => d.decision?.toLowerCase().includes('q3')) },
      { name: "Has at least 2 action items", fn: r => r.action_items?.length >= 2 },
      { name: "John has an action item", fn: r => r.action_items?.some(a => a.owner?.toLowerCase().includes('john')) },
      { name: "Sarah has an action item", fn: r => r.action_items?.some(a => a.owner?.toLowerCase().includes('sarah')) },
      { name: "Has at least 1 risk", fn: r => r.risks_and_blockers?.length >= 1 },
      { name: "Risk mentions payments", fn: r => r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('payment')) },
      { name: "Has at least 1 user need", fn: r => r.user_needs?.length >= 1 },
      { name: "User need has source quote", fn: r => r.user_needs?.some(u => u.source_quote?.length > 5) },
      { name: "Confidence is high", fn: r => r.confidence === 'high' },
    ]
  },
  {
    id: "T2-user-interview",
    description: "User interview — heavy on user needs, minimal decisions",
    transcript: `Interviewer: Tell me about your experience with the current dashboard.
User: Honestly it's overwhelming. There are too many options and I never know where to start.
Interviewer: What do you do when you first log in?
User: I just stare at it for a bit. I wish there was like a getting started guide or something.
Interviewer: Have you used the reporting feature?
User: I tried once but gave up. The filters are really confusing and I couldn't figure out how to export.
Interviewer: What would make it better?
User: Simpler navigation. Like just show me the three things I actually need. And please fix the export — that's the biggest pain point for me.
Interviewer: We're going to prioritise the export fix based on this feedback.`,
    checks: [
      { name: "Has at least 3 user needs", fn: r => r.user_needs?.length >= 3 },
      { name: "User needs have source quotes", fn: r => r.user_needs?.every(u => u.source_quote?.length > 5) },
      { name: "No invented action items without owner", fn: r => !r.action_items?.some(a => !a.owner) },
      { name: "Has at least 1 decision", fn: r => r.decisions?.length >= 1 },
      { name: "No hallucinated risks", fn: r => r.risks_and_blockers?.length <= 2 },
    ]
  },
  {
    id: "T3-messy-standup",
    description: "Messy standup — incomplete sentences, vague commitments, no clear owners",
    transcript: `Dev 1: Yeah so I'm still on the auth thing. Should be done... soon.
Dev 2: Same, working on the API stuff. Bit blocked.
Manager: Blocked on what?
Dev 2: Just some weird edge cases. Will sort it.
Dev 1: Oh also the staging environment is broken again.
Manager: Someone needs to fix that.
Dev 2: Yeah.
Manager: Ok let's keep moving. Everyone know what they're doing?
Dev 1: Yep.
Dev 2: Sure.`,
    checks: [
      { name: "Unassigned items use Unassigned label", fn: r => !r.action_items?.some(a => a.owner === '' || a.owner === null) },
      { name: "Staging issue captured as risk or action", fn: r =>
        r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('staging')) ||
        r.action_items?.some(a => a.task?.toLowerCase().includes('staging')) },
      { name: "Confidence is not high", fn: r => r.confidence !== 'high' },
      { name: "No fabricated decisions", fn: r => r.decisions?.length <= 1 },
    ]
  },
  {
    id: "T4-design-review",
    description: "Design review with disagreements — tests risk vs decision classification",
    transcript: `Designer: I'm proposing we move to a single column layout on mobile.
Engineer: I have concerns about that. It'll double our dev time.
PM: How long are we talking?
Engineer: At least 3 sprints. Maybe 4.
Designer: I think it's worth it for the user experience.
PM: I don't think we can commit to that timeline right now.
Designer: Can we at least agree to do a prototype?
PM: Yes, let's agree to prototype only. No full build commitment yet.
Engineer: Fine with me but I want it on record that the timeline risk is real.
PM: Noted. Lisa will run the prototype sprint starting next Monday.`,
    checks: [
      { name: "Prototype decision captured", fn: r => r.decisions?.some(d => d.decision?.toLowerCase().includes('prototype')) },
      { name: "Timeline risk captured", fn: r => r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('timeline') || r.risk?.toLowerCase().includes('sprint')) },
      { name: "Lisa has action item", fn: r => r.action_items?.some(a => a.owner?.toLowerCase().includes('lisa')) },
      { name: "Full build not marked as decision", fn: r => !r.decisions?.some(d => d.decision?.toLowerCase().includes('full build')) },
      { name: "Has at least 1 risk", fn: r => r.risks_and_blockers?.length >= 1 },
    ]
  },
  {
    id: "T5-voice-note",
    description: "Single speaker voice note — tests solo monologue extraction",
    transcript: `Ok so just recording some notes after the call with the client. They've confirmed budget approval for phase one, that's great news. Main thing to do is send them the SOW by Wednesday — I'll handle that. Also need to loop in the legal team before we sign anything, that's a dependency we can't skip. Client mentioned they're worried about data residency, specifically they need everything hosted in the EU. That's going to affect our infrastructure choices. I'll flag this to the infrastructure team today so they can start scoping the impact.`,
    checks: [
      { name: "Budget approval captured as decision", fn: r => r.decisions?.some(d => d.decision?.toLowerCase().includes('budget') || d.decision?.toLowerCase().includes('phase')) },
      { name: "SOW action item captured", fn: r => r.action_items?.some(a => a.task?.toLowerCase().includes('sow') || a.task?.toLowerCase().includes('statement of work')) },
      { name: "Legal dependency captured", fn: r =>
        r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('legal')) ||
        r.action_items?.some(a => a.task?.toLowerCase().includes('legal')) },
      { name: "EU data residency captured as risk or need", fn: r =>
        r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('eu') || r.risk?.toLowerCase().includes('data residency')) ||
        r.user_needs?.some(u => u.need?.toLowerCase().includes('eu') || u.need?.toLowerCase().includes('data')) },
      { name: "Has at least 2 action items", fn: r => r.action_items?.length >= 2 },
    ]
  },
  {
    id: "T6-mining-client-debrief",
    description: "Real-world mining sector client debrief — tests complex multi-owner action items and procurement risk",
    transcript: `Just wrapped up a meeting with Thabo, the Electrical Superintendent at Karee Ridge Platinum Mine outside Rustenburg. They're currently experiencing reliability issues with their backup power systems, especially during load shedding where switchover delays are causing brief outages on critical equipment.
There's strong interest in a more robust, integrated solution — specifically inverter and battery backup with faster failover and better load management. Budget is available, but procurement will require a detailed technical proposal and full compliance documentation before moving forward.
Feedback from the client was pretty direct — they've had issues with previous suppliers overpromising on uptime and underdelivering on support. Reliability and after-sales service will be key to winning this deal.
The main risk is the approval process — it's likely to move slowly due to internal procurement and safety sign-offs, and they've confirmed they're already engaging with two other vendors.
Action items from my side are to send through a high-level solution proposal with system architecture and expected uptime improvements by Friday, and to set up a technical deep dive with their engineering team early next week.
Tasks:
Johan to scope system design and confirm sizing based on their load profile
Priya to prepare compliance and certification documentation aligned to mining standards
Kabelo to draft the commercial proposal and pricing structure
I'll keep momentum on this and follow up early next week once they've reviewed the proposal.`,
    checks: [
      { name: "Has at least 1 decision", fn: r => r.decisions?.length >= 1 },
      { name: "Johan has action item", fn: r => r.action_items?.some(a => a.owner?.toLowerCase().includes('johan')) },
      { name: "Priya has action item", fn: r => r.action_items?.some(a => a.owner?.toLowerCase().includes('priya')) },
      { name: "Kabelo has action item", fn: r => r.action_items?.some(a => a.owner?.toLowerCase().includes('kabelo')) },
      { name: "Has at least 3 action items", fn: r => r.action_items?.length >= 3 },
      { name: "Procurement risk captured", fn: r => r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('procurement') || r.risk?.toLowerCase().includes('approval')) },
      { name: "Competitor risk captured", fn: r => r.risks_and_blockers?.some(r => r.risk?.toLowerCase().includes('vendor') || r.risk?.toLowerCase().includes('competitor') || r.risk?.toLowerCase().includes('engaging')) },
      { name: "Has at least 2 risks", fn: r => r.risks_and_blockers?.length >= 2 },
      { name: "Reliability user need captured", fn: r => r.user_needs?.some(u => u.need?.toLowerCase().includes('reliab') || u.need?.toLowerCase().includes('support') || u.need?.toLowerCase().includes('service')) },
      { name: "Confidence is not low", fn: r => r.confidence !== 'low' },
    ]
  }
]
