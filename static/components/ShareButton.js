class ShareButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            shareLink: '',
            credits: 0,
            copied: false,
            loading: false
        };
    }

    async generateShareLink() {
        this.setState({ loading: true });
        try {
            const response = await fetch('/api/share/generate-link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            this.setState({ 
                shareLink: data.share_link,
                credits: data.credits,
                loading: false 
            });
        } catch (error) {
            console.error('Error generating share link:', error);
            this.setState({ loading: false });
        }
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.state.shareLink);
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
            
            // Award credits for sharing
            await fetch('/api/share/claim-credit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    }

    shareToTwitter() {
        const text = "Check out Snailer - AI automation made simple!";
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.state.shareLink)}`;
        window.open(url, '_blank');
        this.claimCredit();
    }

    async claimCredit() {
        await fetch('/api/share/claim-credit', { 
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
    }

    componentDidMount() {
        this.generateShareLink();
    }

    render() {
        return React.createElement('div', { className: 'share-button-container' },
            React.createElement('h3', null, `Share for Credits (${this.state.credits} earned)`),
            React.createElement('div', { className: 'share-link-container' },
                React.createElement('input', { 
                    type: 'text', 
                    value: this.state.shareLink, 
                    readOnly: true,
                    className: 'share-link-input'
                }),
                React.createElement('button', { 
                    onClick: () => this.copyToClipboard(),
                    disabled: this.state.loading
                }, this.state.copied ? 'Copied!' : 'Copy & Earn 5 Credits')
            ),
            React.createElement('button', { 
