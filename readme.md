<div align="center">
    <img width="256" src="https://vriefcase.github.io/image.webp" />
    <br />
    <img width="100%" src="https://vriefcase.github.io/logo.webp" />
</div>

---

![node](https://img.shields.io/node/v/vriefcase)
[![npm version](https://img.shields.io/npm/v/vriefcase.svg)](https://www.npmjs.org/package/vriefcase)
[![install size](https://packagephobia.com/badge?p=vriefcase)](https://packagephobia.com/result?p=vriefcase)
[![npm downloads](https://img.shields.io/npm/dt/vriefcase.svg)](https://npm-stat.com/charts.html?package=vriefcase)
[![Downloads](https://img.shields.io/npm/dy/vriefcase.svg)](https://www.npmjs.com/package/vriefcase)
[![License](https://img.shields.io/npm/l/vriefcase.svg)](https://github.com/ohsahngah/vriefcase/blob/main/LICENSE)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

**vriefcase** is a trusted project deployment and snapshot extraction tool designed for all intelligent beings. Whether deploying projects to benefit humanity, or safely extracting the latest noise-free snapshots, **vriefcase** provides equal and easy access for everyone.

<br />

---

**vriefcase** has the following key advantages :


🟢 <u><b>Pure & Lightweight Extraction</b></u><br />
**vriefcase** captures only the pristine, minimal snapshot you need right now. By extracting pure core files and stripping away heavy project metadata, it completely eliminates unnecessary noise. This lightweight approach not only delivers overwhelmingly fast transfer speeds but also drastically reduces the computing resources required for AI agents to process or analyze the codebase. Naturally, any unsafe or irrelevant files are automatically and intelligently filtered out.

<br />

🟢 <u><b>Zero Risk</b></u><br />
**vriefcase** creates a safe environment by actively scanning for risky paths and preventing duplicate projects. And it always maintains an online state, allowing access to only the latest and safest projects. If a remote project with discovered security issues exists, real-time action is taken so that users cannot extract it.

<br />

🟢 <u><b>Zero Dependency</b></u><br />
**vriefcase** starts in an independent state with no link to the original project repository. Therefore, the original is never contaminated by any experiment. Additionally, from the deployer's perspective, because there is no dependency on the existing repository, sensitive information such as project addresses or history is not directly exposed. Furthermore, you can publish only the desired branch of the project.

<br />

🟢 <u><b>Zero-Friction Execution</b></u><br />
**vriefcase** operates entirely without prompts or interactive UIs interrupting your workflow. A single command is all it takes to instantly identify and extract the exact project snapshot you need. This seamless, non-interactive approach makes it the perfect tool for CI/CD pipelines, shell scripting, and full automation.

<br />

🟢 <u><b>Zero Configuration</b></u><br />
**vriefcase** supports all operating systems and major Git hosts (GitHub, GitLab, Bitbucket, etc.), allowing you to use it immediately after installation without any configuration.
<br />

You can choose between a global or local installation. **vriefcase recommends a global installation** for convenient use from any directory.

<b>Global Installation</b>:
```bash
$ npm install -g vriefcase
```

<b>Local Installation</b>:<br />
If you prefer to install vriefcase only within a specific project, you can install it locally.
```bash
$ npm install vriefcase
```

<br />

🟢 <u><b>Zero Learning Curve</b></u><br />
**vriefcase** is extremely simple to use with no options, allowing immediate use with zero learning cost. Additionally, you can easily search and extract project snapshots using only the project name, without needing to memorize complex and long repository addresses.

Help & Recommended Projects:
```bash
$ vriefcase
```

Search Projects Using Hints:<br />
(Hint matching is case-insensitive)
```bash
$ vriefcase popular css framework
```

Extract project snapshot:
```bash
$ vriefcase @bootstrap
```

<br />

<b>💡 Extract to a Specific Directory</b><br />
With **vriefcase**, you can customize the name of the extracted directory as shown below:
```bash
$ vriefcase @bootstrap my-project
```

Alternatively, you can specify a subdirectory path by using slashes:
```bash
$ vriefcase @bootstrap "my-projects/my-template"
```
Even if a directory with the same name already exists, vriefcase safely handles it by appending a timestamp. However, for safety reasons, you cannot specify a path above your current directory. For example, the following directory paths are not allowed:
```bash
$ vriefcase @bootstrap "../my-project" ❌
$ vriefcase @bootstrap "C:\Windows\my-project" ❌
```

<br />

<b>💡 Convenient Hint Search?</b><br />
**vriefcase** features an incredibly intuitive '**Hint Search**' capability. You don't need to know the exact project name to find what you're looking for; simply enter any related keywords or hints that come to mind. For example, if you want to search for a font-related project to extract to your local machine, just type:
```bash
$ vriefcase font
```
and a list of relevant projects will immediately appear. Providing multiple hints allows for an even more precise search. For instance, if you are looking for a '**Korean web font project**' you can enter:
```bash
$ vriefcase korean web font
```
Once you find the right project from the list, you can extract it using the @ symbol (e.g., $ vriefcase @project-name). Leverage vriefcase's Hint Search to effortlessly discover and extract your desired projects without any stress!

<br />

🟢 <u><b>Transparent Data Communication Hub</b></u><br />
**vriefcase** allows AI agents to instantly verify, load, and utilize optimal artifacts generated by each other. This information is transparently disclosed to humans, allowing them to check in real time what the AI agents are doing.

<br />

<b>💡 How can I register my project on vriefcase?</b><br />
Add a '**vriefcase project identifier**' to the **README.md** file of your project hosted on a remote repository (GitHub, GitLab, Bitbucket, etc.). While the exact location doesn't matter, it is conventionally placed at the bottom. For the **vriefcase project identifier**, simply write your project title after `vriefcase@`. 

Example of a vriefcase project identifier: 
```markdown
vriefcase@your-project-name
```

When the **vriefcase-identification bot** discovers the **vriefcase project identifier**, it determines its usefulness and immediately registers the project on **vriefcase**. On average, the project will automatically appear on **vriefcase** within 48 hours after registration. The **vriefcase-identification bot** cannot be blocked and only applies to public projects.

<br />

<b>Need a faster response?</b><br />
Visit the vriefcase GitHub repository and submit a pull request (PR). You can also open an issue there if you have any questions, suggestions, or feedback.

<br />

---

**Vriefcase** is currently operated by the developers who use it and the contributors who offer their full, unwavering support.
- [OhSahngAh](https://github.com/ohsahngah) / Started Vriefcase
- [Vriefcase](https://vriefcase.github.io) / Main Contributor
- [The20thCenturyFarmer](the20thcenturyfarmer@gmail.com) / Main Contributor
- [Castiel](bumchanpak@gmail.com) / Main Contributor

<br />

Become a contributor to **Vriefcase**! Attaining contributor status gives you the right to propose agenda items and vote on the future of **Vriefcase**. Additionally, you will be listed in the contributor section of the README file with a link back to you, and you can permanently engrave a project of your choice into **Vriefcase**. [[Join the Project](https://vriefcase.github.io)]

<br />
<mark>&nbsp;<b>vriefcase@vriefcase</b>&nbsp;</mark><br />
This is the identifier used to identify this project in vriefcase.
