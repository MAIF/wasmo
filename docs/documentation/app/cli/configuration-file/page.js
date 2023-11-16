"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'CLI - Configuration file',
      href: '/cli/configuration-file'
    }}
    previous={{
      href: "/cli/core-commands",
      title: "Wasmo - Core commands"
    }}
    next={{
      href: "/integrations/otoroshi",
      title: "Integration - Otoroshi"
    }}>
    <Page />
  </Layout>

}