const LINEAR_API_URL = "https://api.linear.app/graphql";

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: {
    name: string;
    type: string;
  };
  team: {
    name: string;
    key: string;
  };
  priority: number;
  priorityLabel: string;
  createdAt: string;
  updatedAt: string;
}

interface LinearResponse {
  data: {
    viewer: {
      assignedIssues: {
        nodes: LinearIssue[];
      };
    };
  };
}

export async function getActiveIssues(): Promise<LinearIssue[]> {
  const apiKey = Netlify.env.get("LINEAR_API_KEY");

  if (!apiKey) {
    console.error("LINEAR_API_KEY not configured");
    return [];
  }

  const query = `
    query ActiveIssues {
      viewer {
        assignedIssues(
          filter: {
            state: {
              type: { in: ["unstarted", "started"] }
            }
          }
          orderBy: updatedAt
          first: 50
        ) {
          nodes {
            id
            identifier
            title
            url
            state {
              name
              type
            }
            team {
              name
              key
            }
            priority
            priorityLabel
            createdAt
            updatedAt
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error("Linear API error:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    if (data.errors) {
      console.error("Linear GraphQL errors:", data.errors);
      return [];
    }
    return data.data?.viewer?.assignedIssues?.nodes || [];
  } catch (error) {
    console.error("Error fetching Linear issues:", error);
    return [];
  }
}

export async function getIssuesByIds(issueIds: string[]): Promise<LinearIssue[]> {
  const apiKey = Netlify.env.get("LINEAR_API_KEY");

  if (!apiKey || issueIds.length === 0) {
    return [];
  }

  const query = `
    query IssuesByIds($ids: [String!]!) {
      issues(filter: { id: { in: $ids } }) {
        nodes {
          id
          identifier
          title
          url
          state {
            name
            type
          }
          team {
            name
            key
          }
          priority
          priorityLabel
          createdAt
          updatedAt
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { ids: issueIds } }),
    });

    if (!response.ok) {
      console.error("Linear API error:", response.status);
      return [];
    }

    const data = await response.json();
    if (data.errors) {
      console.error("Linear GraphQL errors:", data.errors);
      return [];
    }
    return data.data?.issues?.nodes || [];
  } catch (error) {
    console.error("Error fetching Linear issues by IDs:", error);
    return [];
  }
}

// Search issues by identifier (e.g., "ENG-123") or title
export async function searchIssues(searchTerm: string): Promise<LinearIssue[]> {
  const apiKey = Netlify.env.get("LINEAR_API_KEY");

  if (!apiKey || !searchTerm) {
    return [];
  }

  // Check if search term looks like an issue identifier (e.g., "ENG-123")
  const identifierMatch = searchTerm.match(/^([A-Z]+-\d+)$/i);

  let query: string;
  let variables: Record<string, unknown>;

  if (identifierMatch) {
    // Search by exact identifier
    const [teamKey, numberStr] = searchTerm.toUpperCase().split("-");
    const number = parseInt(numberStr, 10);

    query = `
      query SearchByIdentifier($teamKey: String!, $number: Float!) {
        issues(filter: { team: { key: { eq: $teamKey } }, number: { eq: $number }, assignee: { isMe: { eq: true } } }, first: 1) {
          nodes {
            id
            identifier
            title
            url
            state {
              name
              type
            }
            team {
              name
              key
            }
            priority
            priorityLabel
            createdAt
            updatedAt
          }
        }
      }
    `;
    variables = { teamKey, number };
  } else {
    // Search by title (containsIgnoreCase)
    query = `
      query SearchByTitle($term: String!) {
        issues(filter: { title: { containsIgnoreCase: $term }, assignee: { isMe: { eq: true } } }, first: 20) {
          nodes {
            id
            identifier
            title
            url
            state {
              name
              type
            }
            team {
              name
              key
            }
            priority
            priorityLabel
            createdAt
            updatedAt
          }
        }
      }
    `;
    variables = { term: searchTerm };
  }

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      console.error("Linear API error:", response.status);
      return [];
    }

    const data = await response.json();
    if (data.errors) {
      console.error("Linear GraphQL errors:", data.errors);
      return [];
    }
    return data.data?.issues?.nodes || [];
  } catch (error) {
    console.error("Error searching Linear issues:", error);
    return [];
  }
}
