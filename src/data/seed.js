// Builds a roadmap (flat node map) from a nested [label, children] tree.
// Each node: { id, label, parentId, status, notes, completedAt }

let counter = 0
const uid = () => {
  // crypto.randomUUID is available in modern browsers; fall back if not.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  counter += 1
  return `n_${Date.now()}_${counter}`
}

// node spec is either a string (leaf) or [label, [...children]]
// opts.links: { label -> url } attaches a resource; opts.search adds a
// GfG-scoped search link to leaves that have no direct URL.
function walk(spec, parentId, nodes, opts) {
  const [label, children] = Array.isArray(spec) ? spec : [spec, []]
  const id = uid()
  const node = makeNode(id, label, parentId)
  if (opts?.links) {
    const direct = opts.links[label]
    if (direct) {
      node.resources = [{ id: uid(), type: 'link', title: 'GeeksforGeeks', url: direct }]
    } else if (opts.search && children.length === 0) {
      const q = encodeURIComponent(`site:geeksforgeeks.org ${label}`)
      node.resources = [{ id: uid(), type: 'link', title: 'Find on GfG', url: `https://www.google.com/search?q=${q}` }]
    }
  }
  nodes[id] = node
  for (const child of children) walk(child, id, nodes, opts)
  return id
}

// Canonical shape of a node. Keep in sync with normalizeNode().
export function makeNode(id, label, parentId) {
  return {
    id,
    label,
    parentId,
    status: 'todo',
    notes: '',
    completedAt: null,
    dueDate: null, // 'YYYY-MM-DD' | null
    priority: null, // 'high' | 'med' | 'low' | null
    resources: [], // [{ id, title, url }]
    subtasks: [], // [{ id, text, done }]
    markers: [], // emoji/icon strings, e.g. ['⭐','🚩']
    labels: [], // short tag strings
    boundary: null, // null | { label, color } — draws a group outline around this subtree
    style: {}, // per-topic visual style overrides (see normalizeNode)
    start: null, // task start date 'YYYY-MM-DD' (Gantt)
    effort: null, // estimated effort, number (shown as a marker)
    mastery: null, // 0–5 self-rated mastery; overrides status in progress roll-up
    review: null, // spaced-repetition schedule { due, interval, ease, reps, lapses, last }
    pos: null, // { x, y } free position for floating topics (drag to place)
    collapsed: false,
  }
}

// Ensure a node loaded from the server / an import has every expected field.
function normalizeNode(n) {
  const out = {
    id: n.id,
    label: n.label ?? 'Untitled',
    parentId: n.parentId ?? null,
    status: n.status ?? 'todo',
    notes: n.notes ?? '',
    completedAt: n.completedAt ?? null,
    dueDate: n.dueDate ?? null,
    priority: n.priority ?? null,
    resources: Array.isArray(n.resources) ? n.resources : [],
    subtasks: Array.isArray(n.subtasks) ? n.subtasks : [],
    markers: Array.isArray(n.markers) ? n.markers : [],
    labels: Array.isArray(n.labels) ? n.labels : [],
    boundary: n.boundary && typeof n.boundary === 'object' ? n.boundary : null,
    // style: { shape, fill, border, borderWidth, fontFamily, fontSize,
    //          bold, italic, underline, strike, textColor, align }
    style: n.style && typeof n.style === 'object' && !Array.isArray(n.style) ? n.style : {},
    start: n.start ?? null,
    effort: n.effort ?? null,
    mastery: typeof n.mastery === 'number' ? n.mastery : null,
    review: n.review && typeof n.review === 'object' ? n.review : null,
    pos: n.pos && typeof n.pos === 'object' ? n.pos : null,
    collapsed: !!n.collapsed,
    floating: !!n.floating, // detached topic (no parent edge to root)
  }
  // Map-level settings live on the root node so they persist with { rootId, nodes }.
  if (n.parentId == null) {
    out.structure = n.structure || 'right'
    out.theme = n.theme || 'classic'
    out.relationships = Array.isArray(n.relationships) ? n.relationships : []
    out.summaries = Array.isArray(n.summaries) ? n.summaries : [] // [{ id, nodeIds[], label }]
    out.savedViews = Array.isArray(n.savedViews) ? n.savedViews : [] // [{ id, name, filter }]
    out.bg = n.bg || null // canvas background color
    out.globalFont = n.globalFont || null // default font family for topics
    out.branchWidth = n.branchWidth || 'default' // thin | default | thick
    out.coloredBranch = n.coloredBranch !== false // theme branch coloring on/off
    out.compact = !!n.compact // tighter spacing
  }
  return out
}

export function normalizeRoadmap(rm) {
  const nodes = {}
  for (const [id, n] of Object.entries(rm.nodes || {})) nodes[id] = normalizeNode({ ...n, id })
  return {
    id: rm.id,
    name: rm.name ?? 'Untitled roadmap',
    rootId: rm.rootId,
    nodes,
  }
}

export function buildRoadmap(name, tree, opts) {
  const nodes = {}
  const rootId = walk(tree, null, nodes, opts)
  return { id: uid(), name, rootId, nodes }
}

// A blank roadmap with a single root node.
export function blankRoadmap(name) {
  return buildRoadmap(name, [name, []])
}

// Curriculum adapted from the GeeksforGeeks Cyber Security Tutorial, organised
// as a learnable path from fundamentals → networking → crypto → attacks →
// defense → forensics → law & practice.
const cyberTree = [
  'Cyber Security Roadmap 2026',
  [
    [
      'Cyber Security Basics',
      [
        'Introduction to Cyber Security',
        'Applications of Cyber Security',
        'CIA Triad (Confidentiality, Integrity, Availability)',
        'Security Attacks',
        ['Hackers & Threat Actors', ['Types of Hackers', 'Understanding Threat Actors']],
        ['Careers & Trends', ['Salary Trends & Market', 'Top Cybersecurity Trends']],
        ['Lab Setup', ['Windows 11 on VirtualBox', 'Kali Linux on VirtualBox']],
      ],
    ],
    [
      'Cyber Threats & Attackers',
      [
        'Cyber Crimes',
        'Cyber Criminal Types',
        'Social Engineering',
        'Cyber-stalking',
        'Botnets',
        'Attack Vectors',
        'Malware',
        'Phishing',
        'Identity Theft',
      ],
    ],
    [
      'Evolution & Objectives',
      [
        'History of Cyber Security',
        'Cybersecurity Metrics',
        'Security Management System',
        'Cybersecurity Frameworks',
        'Critical Infrastructure Security',
      ],
    ],
    [
      'Networking & System Foundations',
      [
        'Computer Networking Basics',
        'OSI Model Layers',
        'Segments, Packets & Frames',
        ['Network Protocols', ['Types of Network Protocols', 'Internet Protocols', 'Email Protocols']],
        'DHCP (Dynamic Host Configuration Protocol)',
        'DNS (Domain Name System)',
        'Wireless LAN Basics',
        'Cloud Computing Security',
      ],
    ],
    [
      'Network Security Fundamentals',
      [
        'Introduction to Network Security',
        ['Network Segmentation', ['Wireless Network Segmentation', 'Network Access Control']],
        ['Firewalls', ['Introduction to Firewalls', 'Types of Network Firewall']],
        'Network Address Translation (NAT)',
        'Proxy Server',
      ],
    ],
    [
      'Traffic Analysis & Monitoring',
      [
        'Introduction to Wireshark',
        'Packet Capturing & Analyzing',
        'Display Filters in Wireshark',
        'Network Traffic Analysis',
      ],
    ],
    [
      'Cryptography & Access Control',
      [
        'Introduction to Cryptography',
        'Symmetric & Asymmetric Encryption',
        'Public Key Infrastructure (PKI)',
        'Digital Signatures',
        'User Access Management',
        ['Applied Cryptography', ['SSL/TLS & Digital Security', 'Hashes, Ciphers & Steganography']],
      ],
    ],
    [
      'Authentication & Integrity',
      [
        ['Message Authentication', ['Message Authentication Codes (MAC)', 'Authentication Protocols']],
        ['Hash Functions', ['Hash Functions in System Security', 'Secure Hash Algorithm (SHA)', 'Whirlpool', 'HMAC']],
        ['Authentication Applications', ['Kerberos', 'X.509 Authentication Service', 'Multi-Factor Authentication', 'Single Sign-On (SSO)']],
      ],
    ],
    [
      'Cyber Attack Techniques',
      [
        ['System & Application Attacks', ['SQL Injection', 'Password Cracking', 'Reverse Engineering']],
        ['Network Attacks', ['DoS & DDoS Attacks', 'Common Network Attacks']],
        ['Web Attacks', ['Web Server Attacks', 'Server-Side Request Forgery (SSRF)', 'Server-Side Template Injection']],
      ],
    ],
    [
      'Cyber Defense & Protection',
      [
        'System Backup',
        'Secure Coding',
        'Security Assessments',
        'Vulnerability Assessment (VA)',
        'Penetration Testing',
        'Security Testing Tools',
        ['Detection Systems', ['Intrusion Detection System (IDS)', 'Intrusion Prevention System (IPS)']],
      ],
    ],
    [
      'Secure Communication Systems',
      [
        ['Email Encryption', ['Pretty Good Privacy (PGP)', 'S/MIME']],
        ['Network-Layer Security', ['IP Security (IPSec)', 'Authentication Header', 'Encapsulating Security Payload']],
        ['Web Security', ['Secure Socket Layer (SSL)', 'Transport Layer Security (TLS)', 'Secure Electronic Transaction']],
      ],
    ],
    [
      'Cyber Forensics',
      [
        [
          'Foundations',
          ['Digital Forensics', 'Investigation Phases', 'Abstract Forensic Model', 'Recovering Deleted Evidence', 'Challenges in Digital Forensics'],
        ],
        ['Tools', ['Data Analysis with Autopsy', 'Kali Linux Forensics']],
        ['Domains', ['Network Forensics', 'Computer Forensics & Steganography', 'Mobile Forensics', 'Windows Forensic Analysis']],
      ],
    ],
    [
      'Cyber Crime Investigation',
      [
        'Introduction to Investigation',
        'Digital Evidence Collection',
        'Evidentiary Reporting',
        'Investigating Phishing Cases',
      ],
    ],
    [
      'Cyber Laws & Ethics',
      [
        'Cyber Ethics & Privacy',
        'Ethical Hacking',
        'IT Act',
        'Intellectual Property in Cyberspace',
        'Cybersecurity Policy',
      ],
    ],
    [
      'Practice & Certifications',
      [
        ['Hands-on Practice', ['Hack The Box & TryHackMe', 'VulnHub & CTF Challenges', 'Interview Questions']],
        ['Key Certifications', ['CompTIA Security+', 'OSCP (Offensive Security)', 'CISSP (Management)', 'CEH (Ethical Hacking)']],
      ],
    ],
  ],
]

// Direct GeeksforGeeks article links, keyed by the leaf/branch labels above.
const G = 'https://www.geeksforgeeks.org'
const CYBER_LINKS = {
  'Introduction to Cyber Security': `${G}/cybersecurity/what-is-cyber-security/`,
  'Applications of Cyber Security': `${G}/cybersecurity/applications-of-cybersecurity/`,
  'CIA Triad (Confidentiality, Integrity, Availability)': `${G}/cybersecurity/the-cia-triad-in-cryptography/`,
  'Security Attacks': `${G}/cybersecurity/types-of-cyber-attacks/`,
  'Types of Hackers': `${G}/cybersecurity/what-is-a-hacker/`,
  'Understanding Threat Actors': `${G}/cybersecurity/threat-actor/`,
  'Cyber Crimes': `${G}/cybersecurity/cyber-crime/`,
  'Cyber Criminal Types': `${G}/cybersecurity/cyber-criminals-and-its-types/`,
  'Social Engineering': `${G}/cybersecurity/social-engineering-the-art-of-virtual-exploitation/`,
  Botnets: `${G}/computer-networks/introduction-of-botnet-in-computer-networks/`,
  'Attack Vectors': `${G}/cybersecurity/emerging-attack-vectors-in-cyber-security/`,
  Malware: `${G}/ethical-hacking/malware-and-its-types/`,
  Phishing: `${G}/cybersecurity/what-is-phishing/`,
  'Computer Networking Basics': `${G}/computer-networks/basics-computer-networking/`,
  'OSI Model Layers': `${G}/computer-networks/open-systems-interconnection-model-osi/`,
  'Network Protocols': `${G}/computer-networks/network-protocols/`,
  'DHCP (Dynamic Host Configuration Protocol)': `${G}/computer-networks/dynamic-host-configuration-protocol-dhcp/`,
  'DNS (Domain Name System)': `${G}/computer-networks/domain-name-system-dns-in-application-layer/`,
  'Introduction to Firewalls': `${G}/computer-networks/introduction-of-firewall-in-computer-network/`,
  'Types of Network Firewall': `${G}/computer-networks/types-of-network-firewall/`,
  'Introduction to Wireshark': `${G}/ethical-hacking/intro-to-wireshark/`,
  'Introduction to Cryptography': `${G}/computer-networks/cryptography-and-its-types/`,
  'Symmetric & Asymmetric Encryption': `${G}/computer-networks/difference-between-symmetric-and-asymmetric-key-encryption/`,
  'Public Key Infrastructure (PKI)': `${G}/computer-networks/public-key-infrastructure/`,
  'Digital Signatures': `${G}/computer-networks/digital-signatures-certificates/`,
  'User Access Management': `${G}/computer-networks/identity-and-access-management-iam-in-cyber-security-roles/`,
  'SQL Injection': `${G}/ethical-hacking/types-of-sql-injection-sqli/`,
  'DoS & DDoS Attacks': `${G}/cybersecurity/difference-between-dos-and-ddos-attack/`,
  'Server-Side Request Forgery (SSRF)': `${G}/ethical-hacking/server-side-request-forgery-ssrf-in-depth/`,
  'Hash Functions': `${G}/dsa/hash-functions-and-list-types-of-hash-functions/`,
  Kerberos: `${G}/computer-networks/kerberos/`,
  'Single Sign-On (SSO)': `${G}/computer-networks/introduction-of-single-sign-on-sso/`,
  'Multi-Factor Authentication': `${G}/computer-networks/multifactor-authentication/`,
  'Vulnerability Assessment (VA)': `${G}/cybersecurity/what-is-vulnerability-assessment/`,
  'Penetration Testing': `${G}/cybersecurity/penetration-testing-software-engineering/`,
  'Intrusion Detection System (IDS)': `${G}/ethical-hacking/intrusion-detection-system-ids/`,
  'Intrusion Prevention System (IPS)': `${G}/ethical-hacking/intrusion-prevention-system-ips/`,
  'Pretty Good Privacy (PGP)': `${G}/computer-networks/pgp-authentication-and-confidentiality/`,
  'IP Security (IPSec)': `${G}/computer-networks/ip-security-ipsec/`,
  'Secure Socket Layer (SSL)': `${G}/computer-networks/secure-socket-layer-ssl/`,
  'Transport Layer Security (TLS)': `${G}/computer-networks/transport-layer-security-tls/`,
  'Digital Forensics': `${G}/cybersecurity/digital-forensics-in-cyber-security/`,
  'Ethical Hacking': `${G}/ethical-hacking/introduction-to-ethical-hacking/`,
  'IT Act': `${G}/cybersecurity/information-technology-act-2000-india/`,
}

export function cyberSecurityRoadmap() {
  const rm = buildRoadmap('Cyber Security Roadmap 2026', cyberTree, { links: CYBER_LINKS, search: true })
  // Pace the curriculum: a target due date per stage (~2 weeks apart) and mark
  // the very first lesson as "in progress" so you have a clear starting point.
  const today = new Date()
  const addDays = (n) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  const stages = Object.values(rm.nodes).filter((n) => n.parentId === rm.rootId)
  stages.forEach((stage, i) => {
    stage.dueDate = addDays((i + 1) * 14)
  })
  const firstLeaf = Object.values(rm.nodes).find((n) => stages[0] && n.parentId === stages[0].id)
  if (firstLeaf) firstLeaf.status = 'doing'
  return rm
}
