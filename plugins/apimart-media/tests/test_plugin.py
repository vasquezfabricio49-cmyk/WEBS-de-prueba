import json
import pathlib
import tomllib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]

class PluginTests(unittest.TestCase):
    def test_manifest_resolves_surfaces(self):
        plugin = json.loads((ROOT / '.codex-plugin/plugin.json').read_text())
        self.assertEqual(plugin['name'], 'apimart-media')
        self.assertTrue((ROOT / plugin['mcpServers']).is_file())
        skills = ROOT / plugin['skills']
        self.assertTrue(list(skills.glob('*/SKILL.md')))

    def test_remote_auth_uses_name_not_key(self):
        server = json.loads((ROOT / '.mcp.json').read_text())['mcpServers']['apimart']
        self.assertEqual(server['url'], 'https://mcp.apimart.ai/mcp')
        self.assertEqual(server['bearer_token_env_var'], 'APIMART_API_KEY')
        self.assertNotIn('headers', server)
        fallback = tomllib.loads((ROOT / 'codex-mcp.toml').read_text())
        self.assertEqual(fallback['mcp_servers']['apimart']['url'], server['url'])

    def test_marketplace_points_to_plugin(self):
        market = json.loads((REPO / '.agents/plugins/marketplace.json').read_text())
        entry = next(item for item in market['plugins'] if item['name'] == 'apimart-media')
        self.assertEqual((REPO / entry['source']['path']).resolve(), ROOT)

    def test_cookie_brief_preserves_request_and_not_fake_result(self):
        brief = json.loads((ROOT / 'requests/galletas-3d.json').read_text())
        self.assertEqual(brief['requested_model_display_name'], 'GPT Image 2 Official')
        self.assertEqual(brief['requested_aspect_ratio'], '16:9')
        self.assertEqual(brief['requested_quality'], 'medium')
        self.assertEqual(brief['status'], 'prepared_not_submitted')
        self.assertNotIn('download_url', brief)
        self.assertIn('cookie', brief['prompt'])

if __name__ == '__main__':
    unittest.main()
