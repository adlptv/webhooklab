import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a demo endpoint
  const endpoint = await prisma.endpoint.create({
    data: {
      name: 'Demo Stripe Endpoint',
      description: 'Test endpoint for Stripe webhooks',
      secret: 'whsec_demo_stripe_secret_key_12345',
      provider: 'stripe',
    },
  });

  // Create sample webhook requests
  await prisma.webhookRequest.create({
    data: {
      endpointId: endpoint.id,
      method: 'POST',
      headers: JSON.stringify({
        'stripe-signature': 't=1234567890,v1=demo_signature',
        'content-type': 'application/json',
        'user-agent': 'Stripe/1.0',
      }),
      body: JSON.stringify({
        id: 'evt_demo_12345',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_demo_12345',
            amount: 4999,
            currency: 'usd',
            status: 'succeeded',
          },
        },
        created: 1234567890,
      }),
      query: '{}',
      raw: '',
      verified: true,
      provider: 'stripe',
      statusCode: 200,
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.webhookRequest.create({
    data: {
      endpointId: endpoint.id,
      method: 'POST',
      headers: JSON.stringify({
        'content-type': 'application/json',
        'user-agent': 'GitHub-Hookshot/abc123',
        'x-github-event': 'push',
      }),
      body: JSON.stringify({
        ref: 'refs/heads/main',
        repository: {
          name: 'demo-repo',
          full_name: 'user/demo-repo',
        },
        pusher: {
          name: 'demo-user',
        },
      }),
      query: '{}',
      raw: '',
      verified: false,
      provider: 'github',
      statusCode: 200,
      ipAddress: '127.0.0.1',
    },
  });

  // Create a demo transform
  await prisma.transform.create({
    data: {
      name: 'Stripe to Slack',
      inputFormat: 'stripe',
      outputFormat: 'slack',
      template: JSON.stringify({
        text: `Payment {{data.object.amount}} {{data.object.currency}} - {{type}}`,
      }),
    },
  });

  console.log('Seed data created successfully');
  console.log(`Demo endpoint ID: ${endpoint.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
