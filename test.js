const vriefcase = require('./vriefcase');


async function main() {
    try {
        // Extract a project automatically by project name
        console.log('Extracting project...');
        await vriefcase('@bootstrap');
        console.log('Extraction complete!\n');

        // Search for projects using multiple hints
        const searchResults = await vriefcase('popular', 'css', 'framework');
        if (searchResults.length > 0) {
            console.log(`Found ${searchResults.length} project(s).`);
            
            // Display search results
            searchResults.forEach(result => {
                console.log(`- ${result.name} (${result.star}): ${result.desc}`);
            });
        } else {
            console.log('No projects found.');
        }

    } catch (error) {
        // Handle invalid project names, network errors, etc.
        console.error('Error:', error.message);
    }
}


main();