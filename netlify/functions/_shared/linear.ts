const LINEAR_API_URL = "https://api.linear.app/graphql";

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
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
            description
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
    const issues = data.data?.viewer?.assignedIssues?.nodes || [];
    console.log(`[Linear <-] Fetched ${issues.length} active issues`);
    return issues;
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
          description
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
    const issues = data.data?.issues?.nodes || [];
    console.log(`[Linear <-] Fetched ${issues.length} issues by ID (requested ${issueIds.length})`);
    for (const issue of issues) {
      console.log(`[Linear <-]   ${issue.identifier}: "${issue.title}" [${issue.state.name}]`);
    }
    return issues;
  } catch (error) {
    console.error("Error fetching Linear issues by IDs:", error);
    return [];
  }
}

export async function getIssueById(issueId: string): Promise<LinearIssue | null> {
  const issues = await getIssuesByIds([issueId]);
  return issues.length > 0 ? issues[0] : null;
}

export interface WorkflowState {
  id: string;
  name: string;
  type: string;
}

interface MutationResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

async function linearMutation(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<MutationResult> {
  const apiKey = Netlify.env.get("LINEAR_API_KEY");
  if (!apiKey) {
    return { success: false, error: "LINEAR_API_KEY not configured" };
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
      const text = await response.text();
      console.error("Linear API error:", response.status, text);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.errors) {
      console.error("Linear GraphQL errors:", data.errors);
      return { success: false, error: data.errors[0]?.message || "GraphQL error" };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error("Linear mutation error:", error);
    return { success: false, error: String(error) };
  }
}

export async function updateIssueTitle(issueId: string, title: string): Promise<MutationResult> {
  console.log(`[Linear ->] Updating title for issue ${issueId}: "${title}"`);
  const result = await linearMutation(
    `mutation UpdateIssue($id: String!, $title: String!) {
      issueUpdate(id: $id, input: { title: $title }) {
        success
      }
    }`,
    { id: issueId, title },
  );
  console.log(`[Linear ->] Title update ${result.success ? "succeeded" : "failed: " + result.error}`);
  return result;
}

export async function updateIssueDescription(issueId: string, description: string): Promise<MutationResult> {
  console.log(`[Linear ->] Updating description for issue ${issueId} (${description.length} chars)`);
  const result = await linearMutation(
    `mutation UpdateIssue($id: String!, $description: String!) {
      issueUpdate(id: $id, input: { description: $description }) {
        success
      }
    }`,
    { id: issueId, description },
  );
  console.log(`[Linear ->] Description update ${result.success ? "succeeded" : "failed: " + result.error}`);
  return result;
}

export async function updateIssueState(issueId: string, stateId: string): Promise<MutationResult> {
  console.log(`[Linear ->] Updating state for issue ${issueId} to state ${stateId}`);
  const result = await linearMutation(
    `mutation UpdateIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
      }
    }`,
    { id: issueId, stateId },
  );
  console.log(`[Linear ->] State update ${result.success ? "succeeded" : "failed: " + result.error}`);
  return result;
}

export async function addComment(issueId: string, body: string): Promise<{ success: boolean; commentId?: string; error?: string }> {
  console.log(`[Linear ->] Creating comment on issue ${issueId} (${body.length} chars)`);
  const result = await linearMutation(
    `mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment {
          id
        }
      }
    }`,
    { issueId, body },
  );

  if (!result.success) {
    console.log(`[Linear ->] Comment creation failed: ${result.error}`);
    return { success: false, error: result.error };
  }

  const commentId = (result.data?.commentCreate as { comment?: { id: string } })?.comment?.id;
  console.log(`[Linear ->] Comment created: ${commentId}`);
  return { success: true, commentId };
}

export async function updateComment(commentId: string, body: string): Promise<MutationResult> {
  console.log(`[Linear ->] Updating comment ${commentId} (${body.length} chars)`);
  const result = await linearMutation(
    `mutation UpdateComment($id: String!, $body: String!) {
      commentUpdate(id: $id, input: { body: $body }) {
        success
      }
    }`,
    { id: commentId, body },
  );
  console.log(`[Linear ->] Comment update ${result.success ? "succeeded" : "failed: " + result.error}`);
  return result;
}

export async function getWorkflowStates(teamId: string): Promise<WorkflowState[]> {
  const apiKey = Netlify.env.get("LINEAR_API_KEY");
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: `query TeamStates($teamId: String!) {
          team(id: $teamId) {
            states {
              nodes {
                id
                name
                type
              }
            }
          }
        }`,
        variables: { teamId },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (data.errors) return [];
    const states = data.data?.team?.states?.nodes || [];
    console.log(`[Linear <-] Fetched ${states.length} workflow states for team ${teamId}: ${states.map((s: WorkflowState) => `${s.name} (${s.type})`).join(", ")}`);
    return states;
  } catch (error) {
    console.error("Error fetching workflow states:", error);
    return [];
  }
}

export async function getIssueTeamId(issueId: string): Promise<string | null> {
  const apiKey = Netlify.env.get("LINEAR_API_KEY");
  if (!apiKey) return null;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: `query IssueTeam($id: String!) {
          issue(id: $id) {
            team {
              id
            }
          }
        }`,
        variables: { id: issueId },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.errors) return null;
    const teamId = data.data?.issue?.team?.id || null;
    console.log(`[Linear <-] Issue ${issueId} belongs to team ${teamId}`);
    return teamId;
  } catch (error) {
    console.error("Error fetching issue team:", error);
    return null;
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
            description
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
            description
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
    const issues = data.data?.issues?.nodes || [];
    console.log(`[Linear <-] Search "${searchTerm}" returned ${issues.length} issues`);
    return issues;
  } catch (error) {
    console.error("Error searching Linear issues:", error);
    return [];
  }
}
