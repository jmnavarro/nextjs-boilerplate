import { headers } from 'next/headers'

export default function WebhookHandlerPage() {
    const headersList = headers();
    const referer = headersList.get('user-agent');

    return (
        <div>from {referer}</div>
    );
  }