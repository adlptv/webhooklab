export interface TransformResult {
  success: boolean;
  output: Record<string, unknown> | null;
  error?: string;
}

// Stripe to Slack transform
export function stripeToSlack(body: Record<string, unknown>): TransformResult {
  try {
    const eventType = body.type as string || 'unknown';
    const eventData = body.data as Record<string, unknown> | undefined;
    const eventObject = eventData?.object as Record<string, unknown> | undefined;

    let amount = '';
    let currency = '';
    if (eventObject?.amount && eventObject?.currency) {
      amount = (eventObject.amount as number) / 100 + ' ' + (eventObject.currency as string).toUpperCase();
    }

    const messages: Record<string, unknown> = {
      text: `🔔 Stripe Event: *${eventType}*`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `Stripe: ${eventType}` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Event ID:*\n${body.id || 'N/A'}` },
            { type: 'mrkdwn', text: `*Type:*\n${eventType}` },
          ],
        },
      ],
    };

    if (amount) {
      (messages.blocks as unknown[]).push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Amount:* ${amount}` },
      });
    }

    return { success: true, output: messages };
  } catch (e) {
    return { success: false, output: null, error: (e as Error).message };
  }
}

// GitHub to Discord transform
export function githubToDiscord(body: Record<string, unknown>, headers: Record<string, string>): TransformResult {
  try {
    const event = headers['x-github-event'] || 'push';
    const repo = body.repository as Record<string, unknown> | undefined;
    const repoName = repo?.full_name as string || 'unknown';

    let content = '';
    let color = 0x24292e;
    const fields: Record<string, unknown>[] = [];

    switch (event) {
      case 'push': {
        const ref = (body.ref as string || '').replace('refs/heads/', '');
        const pusher = (body.pusher as Record<string, unknown>)?.name || 'unknown';
        const commits = (body.commits as unknown[]) || [];
        content = `🔨 **${pusher}** pushed ${commits.length} commit(s) to \`${ref}\` in **${repoName}**`;
        color = 0x28a745;
        for (const c of commits.slice(0, 3)) {
          const commit = c as Record<string, unknown>;
          fields.push({
            name: (commit.id as string)?.substring(0, 7) || '',
            value: (commit.message as string)?.split('\n')[0] || '',
          });
        }
        break;
      }
      case 'pull_request': {
        const action = body.action || 'opened';
        const pr = body.pull_request as Record<string, unknown> | undefined;
        const prNumber = pr?.number;
        const prTitle = pr?.title;
        content = `🔀 PR #${prNumber} *${action}*: ${prTitle} in **${repoName}**`;
        color = 0x6f42c1;
        break;
      }
      case 'issues': {
        const action = body.action || 'opened';
        const issue = body.issue as Record<string, unknown> | undefined;
        const issueNumber = issue?.number;
        const issueTitle = issue?.title;
        content = `📋 Issue #${issueNumber} *${action}*: ${issueTitle} in **${repoName}**`;
        color = 0x0366d6;
        break;
      }
      case 'star': {
        const action = body.action || 'created';
        const sender = (body.sender as Record<string, unknown>)?.login;
        content = `⭐ ${sender} ${action} star on **${repoName}**`;
        color = 0xffca28;
        break;
      }
      default:
        content = `📦 GitHub event: *${event}* on **${repoName}**`;
    }

    return {
      success: true,
      output: {
        content,
        embeds: [
          {
            title: `GitHub: ${event}`,
            description: content,
            color,
            fields: fields.length > 0 ? fields : undefined,
            footer: { text: repoName },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  } catch (e) {
    return { success: false, output: null, error: (e as Error).message };
  }
}

// Shopify to Slack transform
export function shopifyToSlack(body: Record<string, unknown>, topic: string): TransformResult {
  try {
    let text = `🛍️ Shopify: ${topic}`;
    const blocks: unknown[] = [
      { type: 'header', text: { type: 'plain_text', text: `Shopify: ${topic}` } },
    ];

    if (topic.includes('orders/') && body.id) {
      const total = (body.total_price as string) || '0.00';
      const currency = (body.currency as string) || 'USD';
      const email = (body.email as string) || 'unknown';
      text = `🛍️ New order #${body.id} - ${total} ${currency}`;
      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Order:*\n#${body.id}` },
          { type: 'mrkdwn', text: `*Total:*\n${total} ${currency}` },
          { type: 'mrkdwn', text: `*Customer:*\n${email}` },
        ],
      });
    } else if (topic.includes('customers/') && body.id) {
      const name = `${body.first_name || ''} ${body.last_name || ''}`.trim();
      text = `👤 Customer ${topic}: ${name}`;
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Customer:* ${name} (#${body.id})` },
      });
    }

    return {
      success: true,
      output: { text, blocks },
    };
  } catch (e) {
    return { success: false, output: null, error: (e as Error).message };
  }
}

// Generic transform using template
export function applyTemplate(
  input: Record<string, unknown>,
  template: Record<string, unknown>
): TransformResult {
  try {
    const result = resolveTemplate(template, input);
    return { success: true, output: result };
  } catch (e) {
    return { success: false, output: null, error: (e as Error).message };
  }
}

function resolveTemplate(template: unknown, data: unknown): unknown {
  if (typeof template === 'string') {
    return resolveTemplateString(template, data);
  }

  if (Array.isArray(template)) {
    return template.map((item) => resolveTemplate(item, data));
  }

  if (template !== null && typeof template === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = resolveTemplate(value, data);
    }
    return result;
  }

  return template;
}

function resolveTemplateString(tpl: string, data: unknown): string {
  return tpl.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) => {
    const value = getByPath(data, path.trim());
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
