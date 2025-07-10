// Linhas que estavam causando 'already declared'
// const fetchNews = require('../fetch-news'); // Removido - o script é carregado dinamicamente
// const fs = require('fs'); // Removido - fs é mockado ou usado via jest.requireActual
// const { Readable } = require('stream'); // Removido - não usado diretamente nos testes

// Se Readable fosse necessário para algum teste específico, seria importado dentro desse teste ou no topo se não conflitasse.

// const fs = require('fs'); // Comentado ou removido
// const { Readable } = require('stream'); // Removido para evitar redeclaração, se não for usado no teste.
// Se Readable for necessário, garantir que não haja dupla importação.
// Por enquanto, vamos remover, pois não parece ser usado diretamente nos testes.

// Não vamos mais mockar no topo do arquivo para fs e node-fetch
// Os mocks serão aplicados dinamicamente dentro do beforeEach

describe('News Fetching and README Update', () => {
    const mockApiKey = 'test_api_key';
    const originalEnv = { ...process.env }; // Salva uma cópia do process.env original
    const readmePath = 'README.md';
    const newsSectionStart = '<!-- NEWS:START -->';
    const newsSectionEnd = '<!-- NEWS:END -->';

    let mockFetch;
    let mockFs;
    let consoleErrorSpy;
    let consoleLogSpy;

    beforeEach(() => {
        jest.resetModules(); // Limpa o cache de módulos, incluindo fetch-news.js

        // node-fetch será automaticamente mockado pela pasta __mocks__
        // Precisamos importar a instância mockada para controlá-la
        mockFetch = require('node-fetch');
        mockFetch.mockClear();

        // Configura o mock para fs
        mockFs = {
            ...jest.requireActual('fs'),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
        };
        jest.mock('fs', () => mockFs); // Mock fs dinamicamente

        process.env = { ...originalEnv, NEWS_API_KEY: mockApiKey };

        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        // Não é necessário jest.unmock('node-fetch') quando usando __mocks__ automaticamente
        // jest.unmock('fs'); // Continua útil se fs for mockado dinamicamente
    });

    // Função helper para carregar e executar o script sob teste
    const loadAndRunScript = async () => {
        require('../fetch-news');
        await new Promise(process.nextTick);
    };

    describe('fetchTopHeadlines (via script execution)', () => {
        it('should handle successful API response', async () => {
            const mockArticles = [{ title: 'Test Article 1', url: 'http://example.com/1', source: { name: 'Test Source 1' }, publishedAt: new Date().toISOString() }];
            mockFetch.mockResolvedValueOnce({ // mockFetch é a função importada de __mocks__
                ok: true,
                json: async () => ({ articles: mockArticles }),
            });
            mockFs.readFileSync.mockReturnValue(`## News\n${newsSectionStart}\nOld news\n${newsSectionEnd}\n## Other Section`);

            await loadAndRunScript(); // Usa a função helper
            // Adicionar uma pequena espera para garantir que todas as operações assíncronas no script sejam concluídas
            // await new Promise(process.nextTick); // Já está em loadAndRunScript


            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(mockApiKey));
            const writtenContentSuccess = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContentSuccess).toContain('Test Article 1');
        });

        it('should handle API error response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Internal Server Error' }),
            });
            // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Já está no beforeEach
            mockFs.readFileSync.mockReturnValue(`## News\n${newsSectionStart}\nOld news\n${newsSectionEnd}\n## Other Section`);

            await loadAndRunScript(); // Usa a função helper

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith('NewsAPI Error:', { message: 'Internal Server Error' });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching news:', expect.any(Error));
            // Ajuste na verificação do conteúdo escrito:
            const writtenContentOnError = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContentOnError).toContain('No news available at the moment.');
            // consoleErrorSpy.mockRestore(); // Será feito no afterEach
        });

        it('should handle network error when fetching news', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Já está no beforeEach
            mockFs.readFileSync.mockReturnValue(`## News\n${newsSectionStart}\nOld news\n${newsSectionEnd}\n## Other Section`);

            await loadAndRunScript(); // Usa a função helper

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching news:', new Error('Network error'));
            const writtenContentOnNetworkError = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContentOnNetworkError).toContain('No news available at the moment.');
            // consoleErrorSpy.mockRestore(); // Será feito no afterEach
        });
    });

    describe('formatNewsArticles (via script execution effect)', () => {
        it('should format articles correctly', async () => {
            const articles = [
                { title: 'Article A', url: 'http://a.com', source: { name: 'Source A' }, publishedAt: '2023-01-01T12:00:00Z' },
                { title: 'Article B', url: 'http://b.com', source: { name: 'Source B' }, publishedAt: '2023-01-02T15:30:00Z' },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ articles }),
            });
            mockFs.readFileSync.mockReturnValue(`${newsSectionStart}\n${newsSectionEnd}`);

            await loadAndRunScript(); // Usa a função helper

            const expectedDateA = new Date('2023-01-01T12:00:00Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const expectedDateB = new Date('2023-01-02T15:30:00Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            const writtenContentFormat = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContentFormat).toContain(`<li><a href="http://a.com" target="_blank">Article A</a> (<em>Source A</em> - ${expectedDateA})</li>`);
            expect(writtenContentFormat).toContain(`<li><a href="http://b.com" target="_blank">Article B</a> (<em>Source B</em> - ${expectedDateB})</li>`);
        });

        it('should return "no news" message if articles array is empty', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ articles: [] }),
            });
            mockFs.readFileSync.mockReturnValue(`${newsSectionStart}\n${newsSectionEnd}`);

            await loadAndRunScript(); // Usa a função helper

            const writtenContentEmpty = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContentEmpty).toContain('No news available at the moment. 🙁');
        });
    });

    describe('updateReadmeWithNews (via script execution)', () => {
        it('should update README correctly when markers exist', async () => {
            const mockArticles = [{ title: 'Cool Tech Stuff', url: 'http://cool.tech', source: { name: 'Tech Weekly' }, publishedAt: new Date().toISOString() }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ articles: mockArticles }),
            });
            const initialReadmeContent = `Pre-section\n${newsSectionStart}\nOld news content here\n${newsSectionEnd}\nPost-section`;
            mockFs.readFileSync.mockReturnValue(initialReadmeContent);

            await require('../fetch-news');
            await new Promise(process.nextTick);

            const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContent).toContain('Pre-section');
            expect(writtenContent).toContain('Cool Tech Stuff');
            expect(writtenContent).not.toContain('Old news content here');
            expect(writtenContent).toContain('Post-section');
            expect(writtenContent.indexOf('Cool Tech Stuff')).toBeGreaterThan(writtenContent.indexOf(newsSectionStart));
            expect(writtenContent.indexOf('Cool Tech Stuff')).toBeLessThan(writtenContent.indexOf(newsSectionEnd));
        });

        it('should add news section if markers do not exist', async () => {
            const mockArticles = [{ title: 'New Section News', url: 'http://new.section', source: { name: 'Creator News' }, publishedAt: new Date().toISOString() }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ articles: mockArticles }),
            });
            const initialReadmeContent = `# My Awesome README\n\nSome other content.`;
            mockFs.readFileSync.mockReturnValue(initialReadmeContent);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});


            await require('../fetch-news');
            await new Promise(process.nextTick);

            expect(consoleErrorSpy).toHaveBeenCalledWith('News section markers not found or incorrect in README.md');
            expect(consoleLogSpy).toHaveBeenCalledWith('News section added to README.md');

            const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenContent).toContain('# My Awesome README');
            expect(writtenContent).toContain('## 📰 **Latest Tech News (Brazil)**');
            expect(writtenContent).toContain(newsSectionStart);
            expect(writtenContent).toContain('New Section News');
            expect(writtenContent).toContain(newsSectionEnd);
            consoleErrorSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('should handle error reading README file', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ articles: [{ title: 'Any', url: 'http://any.com', source: {name: 'AnySource'}, publishedAt: new Date().toISOString() }] }),
            });
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('Failed to read file');
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await require('../fetch-news');
            await new Promise(process.nextTick);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating README.md:', new Error('Failed to read file'));
            expect(mockFs.writeFileSync).not.toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });
});
