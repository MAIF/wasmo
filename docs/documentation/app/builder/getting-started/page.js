"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout next={{
    href: "/builder/your-first-plugin",
    title: "Wasmo CLI"
  }}>
    <Page />
  </Layout>

}