"use client"

import Layout from '@/components/Layout';
import Page from './page.mdx';

export default function Home() {

  return <Layout next={{
    href: "/cli/overview",
    title: "Wasmo CLI"
  }}>
    <Page />
  </Layout>

}