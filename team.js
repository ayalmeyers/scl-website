// Strategic Communication Lab — team roster, single source of truth.
// Rendered into both index.html's homepage teaser grid and
// who-we-are.html's full roster grid + bio dialogs by renderTeam()
// in main.js. Edit a person here once; both pages pick it up.
//
// Fields:
//   id    — used to build the dialog id "dlg-<id>" and deep links
//           (who-we-are.html#dlg-<id>), unchanged from the existing markup.
//   name, role, photo — unchanged from current site text/files.
//   bio   — array of bio paragraphs (HTML allowed for the rare <em>/&amp;),
//           shown only on who-we-are.html. Omit (or leave empty) for
//           roster members who appear in the grid but have no bio copy yet.
window.SCL_TEAM = [
  {
    id: "farhad",
    name: "Farhad Motiwalla",
    role: "Consultant",
    photo: "farhad-motiwalla.jpg",
    bio: [
      "Farhad Motiwalla is a senior leadership, communication, and strategy specialist. He works with business leaders on the skills and strategies required to drive results. He specializes in helping C-suite executives and company board members lead, grow, and manage their organizations through complexities and times of change. He also works with leaders to clearly think through intended and unintended consequences, and to develop their authentic brand while leading in complex times.",
      "In addition, Farhad effectively coaches leaders in areas that involve persuasive communication skills for a variety of high-stakes situations, such as business development, negotiations, and ethical decision making. Clients value Farhad's insightful advice and his ability to execute dramatic change. Both clients and colleagues have expressed that Farhad challenges them to think beyond what is currently known to ascertain the right direction and strategies needed to achieve desired results: \"He gives you the clarity with which to help you better know, understand, and lead yourself.\"",
      "A graduate of Cornell University, Farhad speaks English, Hindi, Arabic, French, as well as some Italian. He has worked with companies ranging widely in size, market, and geography, from the Middle East to the Far East, Europe, South America, and North America.",
      "Farhad has served as a well-regarded coaching faculty member for Harvard University's Advanced Management Program within the Harvard Business School. He resides in the New York City metro area with his two children."
    ]
  },
  {
    id: "sarah-jane",
    name: "Sarah-Jane Campbell",
    role: "Communication Specialist",
    photo: "sarah-jane-campbell.jpg",
    bio: [
      "Sarah-Jane Campbell is a senior communications consultant and executive coach, recognized for helping leaders communicate with clarity, confidence, and authority. She brings a distinctive combination of strategic insight, facilitation expertise, and executive presence to her work, partnering with senior leaders to refine their leadership style, sharpen high-stakes messaging, elevate delivery, and build high-performing teams.",
      "With deep experience coaching executives through mission-critical moments, Sarah-Jane is especially skilled at preparing C-suite leaders for high-profile events such as investor days, board meetings, and crisis communications. Her clients value her calm, analytical approach and ability to distill complex ideas into clear, compelling narratives tailored for internal and external stakeholders.",
      "From investor presentations and keynote speeches to high-stakes pitches, negotiations, and media appearances, Sarah-Jane equips leaders to deliver with authenticity, presence, and measurable impact — coaching that is tailored, strategic, and results-driven.",
      "Prior to her work in executive communications, Sarah-Jane was a civil litigator and partner at George Brown Professional Corporation. She holds a Bachelor of Arts in Political Science from Queen's University and is a member of the Law Society of Ontario. She lives in the Greater Toronto Area, Canada."
    ]
  },
  {
    id: "jennifer",
    name: "Jennifer Tarsitano",
    role: "Senior Communications Consultant",
    photo: "jennifer-tarsitano.jpg",
    bio: [
      "Jennifer Tarsitano is a seasoned business advisor and senior communications consultant. She has extensive experience helping business leaders be more strategic and thoughtful in their approach, allowing them to communicate more effectively and deliver meaningful results in fast-paced, high-pressure environments.",
      "Jennifer thrives in fast-paced environments and is recognized by clients for her practical approach and her ability to quickly understand client objectives, anticipate challenges, and identify solutions that balance competing priorities. Her combination of business acumen, communications approach, and client-centric thinking enables leaders to respond effectively to evolving opportunities and challenges.",
      "Having worked with leaders across the globe, Jennifer brings deep cross-industry experience helping professionals navigate high-stakes communication situations — from media training and skill development to strategic counsel and pitch consulting. Her clients span financial services, education, insurance, retail, telecommunications, healthcare, advertising, and the nonprofit sector.",
      "Prior to joining SCL, Jennifer served as Vice President of Customer Experience at VEIL Global Technologies, and was Vice President of Marketing for Digitas, one of the world's leading digital marketing and media agencies. Jennifer holds a Bachelor's in Communication Studies from the University of Rhode Island. A Rhode Island native, she resides there with her children."
    ]
  },
  {
    id: "jeff",
    name: "Jeff Penney",
    role: "Consultant",
    photo: "JeffPenny.jpg",
    bio: [
      "Jeff Penney is an experienced management consultant and executive coach. Jeff specializes in advising C-suite executives on critical leadership, communication, and business issues. His practical insights help clients navigate complex corporate dynamics, develop strategy, and lead teams through successful execution.",
      "Through his 35-year career, Jeff has led global organizations and managed teams in investment banking and capital markets at Merrill Lynch, Morgan Stanley, and Credit Suisse — augmented by his recent roles as Chief Strategy Officer for Two Sigma Investments, Global Head of Strategy for the Corporate and Investment Bank of JP Morgan, and Senior Advisor to McKinsey &amp; Company. An engineer by training, his familiarity with the latest innovations makes him a unique partner and wise counsel.",
      "As an advisor, Jeff has served banks, broker-dealers, data and information companies, private equity firms, regulators, and exchange groups on issues such as business portfolio and resource optimization, organization, governance, and acquisitions. He is well-versed in strategy, risk management, operations, technology, client management, and product marketing.",
      "Jeff is a graduate of Princeton University, where he serves on the Advisory Council for the Department of Operations Research and Financial Engineering, and is co-founder of Wealth Technologies Inc., acquired by Money Lion, Inc. in 2020. A drummer, ice hockey fan and home cook, Jeff resides with his wife in New York City's West Village."
    ]
  },
  {
    id: "jim",
    name: "Jim Zarvos",
    role: "Leadership Counsel",
    photo: "JimZarvos.jpg",
    bio: [
      "Jim Zarvos is a senior consultant specializing in executive coaching and shaping high performance teams. Jim has an extensive background in dramatically improving people's ability to lead effectively, communicate, coach, and produce unprecedented results.",
      "Jim has a keen ability to understand complex business issues, interpersonal dynamics, and underlying drivers in decision making — guiding leaders to be more impactful in their management of these issues and decisions. Jim uses a rigorous approach to help leaders challenge their own current thinking and biases to create exceptional results.",
      "His work has evoked personal and organizational breakthroughs with both established and emerging companies such as AlixPartners, Citigroup, Ubisoft, JP Morgan Chase &amp; Co, Careerbuilder.com, American Express, Eli Lilly, and Southwest Airlines. He is currently involved in consulting and training projects across North America, Europe, and Asia.",
      "Jim is featured in the movie <em>The Absolute Answer to Everything</em> and has written <em>The Absolutes of Leadership</em>. When he isn't writing or facilitating, he enjoys spending time with his four children and his wife, Nora."
    ]
  },
  {
    id: "neil",
    name: "Neil Johnson",
    role: "Consultant",
    photo: "NeilJohnson.jpg",
    bio: [
      "Neil Johnson, CFA, brings over 40 years of business experience to SCL from some of the most prestigious asset management firms. He is uniquely qualified to provide pitch consulting, executive coaching, and leadership counsel given his real-life experience as an institutional asset management sales producer, leader, and executive.",
      "Neil is widely recognized for his discipline, rigor, and persistence — the hallmarks of winning complex and challenging opportunities.",
      "Neil has worked with closely knit teams at small and large firms: SEI, Hamilton &amp; Co., Neuberger Berman, AIG, Credit Suisse, Sustainable Asset Management (a Robeco company), and BNP Paribas. His investment strategy experience spans traditional equity and fixed income, hedge funds, private equity and debt, quantitative, real estate, infrastructure, commodities, currencies, and sustainability/ESG/impact/clean tech investing, including extensive knowledge of ESG factors and integration."
    ]
  },
  {
    id: "megan",
    name: "Megan Broker",
    role: "Consultant",
    photo: "MeganBroker.jpg",
    bio: [
      "Megan Broker is a consultant with SCL, working with leaders and teams on the communication and strategy challenges that come with high-stakes engagements."
    ]
  }
];
