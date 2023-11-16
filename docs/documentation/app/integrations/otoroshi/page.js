"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Integrations - Otoroshi',
      href: '/integrations/otoroshi'
    }}
    previous={{
      href: "/cli/configuration-file",
      title: "CLI - Configuration file"
    }}>
    <Page />
  </Layout>

}